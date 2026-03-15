'use strict';

const {DaemonBackend} = require('../engine-backend');

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');

const getBuildkitConfig = require('../../../utils/get-buildkit-config');
const getContainerdConfig = require('../../../utils/get-containerd-config');
const perfTimer = require('../../../utils/perf-timer');
const LimaManager = require('./lima-manager');
const WslHelper = require('./wsl-helper');
const FinchDaemonManager = require('./finch-daemon-manager');

const Cache = require('../../cache');
const Events = require('../../events');
const Log = require('../../logger');
const Promise = require('../../promise');

/**
 * Containerd implementation of the DaemonBackend interface.
 *
 * Manages Lando's **own isolated** containerd + buildkitd daemons. This is
 * completely separate from Docker or any other container runtime on the host.
 *
 * The daemon keeps its state under `~/.lando` by default:
 *
 * | Path                              | Purpose                       |
 * |-----------------------------------|-------------------------------|
 * | `~/.lando/bin/containerd`         | containerd binary             |
 * | `~/.lando/bin/buildkitd`          | buildkitd binary              |
 * | `~/.lando/bin/nerdctl`            | nerdctl binary                |
 * | `/run/lando/containerd.sock`      | containerd gRPC socket        |
 * | `/run/lando/buildkitd.sock`       | buildkitd gRPC socket         |
 * | `~/.lando/run/containerd.pid`     | containerd PID file           |
 * | `~/.lando/run/buildkitd.pid`      | buildkitd PID file            |
 * | `~/.lando/state/containerd/`      | containerd state directory    |
 * | `~/.lando/data/containerd/`       | containerd root (images, etc) |
 *
 * Platform notes:
 * - **Linux**: runs natively (may need sudo for rootful mode).
 * - **WSL**: runs natively inside the WSL2 distro.
 * - **macOS (darwin)**: runs inside a Lima VM with containerd enabled.
 *   The Lima VM exposes the containerd socket at `~/.lima/lando/sock/containerd.sock`.
 * - **Windows (win32, non-WSL)**: **not yet implemented**.
 *
 * @extends DaemonBackend
 * @since 4.0.0
 */
class ContainerdDaemon extends DaemonBackend {
  /**
   * Create a ContainerdDaemon backend.
   *
   * @param {Object}  [opts={}]               - Configuration options.
   * @param {string}  [opts.userConfRoot]      - Base directory (default `~/.lando`).
   * @param {string}  [opts.platform]          - Override platform detection.
   * @param {string}  [opts.containerdBin]     - Path to containerd binary.
   * @param {string}  [opts.buildkitdBin]      - Path to buildkitd binary.
   * @param {string}  [opts.nerdctlBin]        - Path to nerdctl binary.
   * @param {string}  [opts.socketPath]        - containerd gRPC socket path.
   * @param {string}  [opts.buildkitSocket]    - buildkitd gRPC socket path.
   * @param {string}  [opts.stateDir]          - containerd state directory.
   * @param {Object}  [opts.events]            - A Lando Events instance.
   * @param {Object}  [opts.cache]             - A Lando Cache instance.
   * @param {Object}  [opts.log]               - A Lando Log instance.
   */
  constructor(opts = {}) {
    super();

    // Ensure /usr/sbin and /sbin are in PATH for CNI plugins (iptables) and containerd shims
    if (process.platform === 'linux' && process.env.PATH && !process.env.PATH.includes('/usr/sbin')) {
      process.env.PATH = `/usr/sbin:/sbin:${process.env.PATH}`;
    }

    const userConfRoot = opts.userConfRoot ?? path.join(os.homedir(), '.lando');

    /** @type {string} */
    this.platform = opts.platform ?? process.landoPlatform ?? process.platform;

    /** @type {boolean} */
    this.isRunning = false;

    /** @type {Object} */
    this.events = opts.events ?? new Events();

    /** @type {Object} */
    this.cache = opts.cache ?? new Cache();

    /** @type {Object} */
    this.log = opts.log ?? new Log();

    /** @type {Function} */
    this.debug = require('../../../utils/debug-shim')(this.log);

    /** @type {boolean} Whether to emit debug-level logging in the containerd config. */
    this.debugMode = opts.debug === true;

    // Binary paths
    // containerd lives in the system-wide Lando bin dir (installed by setup hook)
    const systemBinDir = '/usr/local/lib/lando/bin';
    // User-local binaries (nerdctl, buildkitd) stay under ~/.lando/bin
    const binDir = path.join(userConfRoot, 'bin');

    /** @type {string} Path to the containerd binary (system-wide). */
    this.containerdBin = opts.containerdBin ?? path.join(systemBinDir, 'containerd');

    /** @type {string} Path to the buildkitd binary. */
    this.buildkitdBin = opts.buildkitdBin ?? path.join(binDir, 'buildkitd');

    /** @type {string} Path to the buildctl binary (alongside buildkitd). */
    this.buildctlBin = path.join(path.dirname(this.buildkitdBin), 'buildctl');

    /** @type {string} Path to the nerdctl binary (used as the "docker" equivalent). */
    this.nerdctlBin = opts.nerdctlBin ?? path.join(binDir, 'nerdctl');

    // Socket paths — sockets go in /run/lando/ (root-owned, group-accessible via systemd)
    const socketDir = '/run/lando';

    /** @type {string} containerd gRPC socket. */
    this.socketPath = opts.socketPath ?? path.join(socketDir, 'containerd.sock');

    /** @type {string} buildkitd gRPC socket. */
    this.buildkitSocket = opts.buildkitSocket ?? path.join(socketDir, 'buildkitd.sock');

    // PID files stay in ~/.lando/run/ (user-level)
    const runDir = path.join(userConfRoot, 'run');

    /** @type {string} */
    this.containerdPidFile = path.join(runDir, 'containerd.pid');

    /** @type {string} */
    this.buildkitdPidFile = path.join(runDir, 'buildkitd.pid');

    // Directories
    /** @type {string} */
    this.runDir = runDir;

    /** @type {string} Log directory for daemon stderr output. */
    this.logDir = path.join(userConfRoot, 'logs');

    /** @type {string} containerd --state directory. */
    this.stateDir = opts.stateDir ?? path.join(userConfRoot, 'state', 'containerd');

    /** @type {string} containerd --root directory (images, snapshots, etc). */
    this.rootDir = path.join(userConfRoot, 'data', 'containerd');

    // DaemonBackend interface properties
    /**
     * @type {string|false}
     * NOTE: this.compose holds the nerdctl binary path, NOT a docker-compose
     * compatible binary. nerdctl requires the subcommand `nerdctl compose ...`
     * rather than being invoked directly as `docker-compose`. Set to false
     * until a proper NerdctlComposeBackend is implemented.
     */
    this.compose = false;

    /** @type {string|false} Path to nerdctl (analogous to docker CLI). */
    this.docker = this.nerdctlBin;

    /** @type {string} Path to containerd binary (used by Engine to check containerd availability). */
    this.containerd = this.containerdBin;

    /** @type {string} Path to nerdctl binary. */
    this.nerdctl = this.nerdctlBin;

    // Lima VM manager for macOS containerd support
    /** @type {LimaManager|null} */
    this.lima = null;
    if (this.platform === 'darwin') {
      this.lima = new LimaManager({
        limactl: opts.limactl ?? 'limactl',
        vmName: opts.limaVmName ?? 'lando',
        cpus: opts.limaCpus ?? 4,
        memory: opts.limaMemory ?? 4,
        disk: opts.limaDisk ?? 60,
        debug: this.debug,
      });
    }

    // WSL2 support
    /** @type {WslHelper|null} */
    this.wslHelper = null;
    this.configDir = path.join(userConfRoot, 'config');
    this.configPath = path.join(this.configDir, 'containerd-config.toml');
    this.buildkitConfigPath = path.join(this.configDir, 'buildkit-config.toml');
    if (WslHelper.isWsl()) {
      this.wslHelper = new WslHelper({debug: this.debug, userConfRoot});
    }

    // Finch daemon for Docker API compatibility (Traefik proxy)
    this.finchDaemon = new FinchDaemonManager({
      finchDaemonBin: opts.finchDaemonBin || path.join(binDir, 'finch-daemon'),
      containerdSocket: this.socketPath,
      socketPath: opts.finchDaemonSocket || path.join(socketDir, 'finch.sock'),
      logDir: this.logDir,
      debug: this.debug,
    });
  }

  /**
   * Start the containerd + buildkitd daemons.
   *
   * 1. Validates platform support.
   * 2. Creates required directories.
   * 3. Starts containerd if not already running.
   * 4. Waits for containerd socket to be responsive.
   * 5. Starts buildkitd if not already running.
   * 6. Waits for buildkitd socket to appear.
   * 7. Emits pre/post-engine-up events.
   *
   * @param {boolean|Object} [retry=true] - Retry configuration.
   * @param {string} [password] - Optional sudo password for elevated permissions on Linux.
   * @returns {Promise<void>}
   */
  async up(retry = true, password) {
    // Normalize retry opts (same pattern as Docker daemon)
    if (retry === true) retry = {max: 25, backoff: 1000};
    else if (retry === false) retry = {max: 0};

    // Platform guard
    this._assertPlatformSupported();

    // Short-circuit: if the containerd binary doesn't exist, there's nothing to start
    // This avoids expensive retry loops when containerd hasn't been installed yet
    if (this.platform !== 'darwin' && !fs.existsSync(this.containerdBin)) {
      throw new Error(`containerd binary not found at ${this.containerdBin}, skipping start`);
    }

    await this.events.emit('pre-engine-up');

    // macOS: delegate to Lima VM
    if (this.platform === 'darwin' && this.lima) {
      const limaStarter = async () => {
        try {
          // Create the VM if it doesn't exist
          await this.lima.createVM();

          // Start the VM
          await this.lima.startVM();

          // Point socket path to the Lima-exposed containerd socket
          this.socketPath = this.lima.getSocketPath();

          this.debug('containerd engine started via Lima VM, socket at %s', this.socketPath);
          return Promise.resolve();
        } catch (error) {
          this.debug('could not start containerd via Lima with %o', error?.message);
          return Promise.reject(error);
        }
      };

      await Promise.retry(limaStarter, retry);
      this.isRunning = true;
      await this.events.emit('post-engine-up');
      return;
    }

    // Ensure required directories exist
    this._ensureDirectories();

    // Retry loop: start daemons and wait until responsive
    const starter = async () => {
      const isUp = await this.isUp();
      if (isUp) return Promise.resolve();

      const upTimer = this.debugMode ? perfTimer('containerd-engine-up') : null;

      try {
        // On Linux, containerd runs as a systemd service (rootful)
        if (this.platform === 'linux') {
          await this._ensureSystemdService();
        } else {
          // Non-Linux (WSL, etc.): start containerd directly
          if (!this._isProcessRunning(this.containerdPidFile)) {
            await this._startContainerd(password);
          }
          await this._waitForSocket(this.socketPath, 'containerd', 10);
        }

        // Verify containerd is responsive
        await this._healthCheck();

        // Start buildkitd if not running
        if (!this._isProcessRunning(this.buildkitdPidFile)) {
          await this._startBuildkitd(password);
        }
        await this._waitForSocket(this.buildkitSocket, 'buildkitd', 10);

        // Start finch-daemon for Docker API compatibility (Traefik proxy)
        if (!(await this.finchDaemon.isRunning())) {
          await this.finchDaemon.start();
        }
        await this._waitForSocket(this.finchDaemon.getSocketPath(), 'finch-daemon', 10);

        if (upTimer) this.debug('%s completed in %.1fms', upTimer.label, upTimer.stop());
        this.debug('containerd engine started successfully');
        return Promise.resolve();
      } catch (error) {
        if (upTimer) this.debug('%s failed after %.1fms', upTimer.label, upTimer.stop());
        this.debug('could not start containerd engine with %o', error?.message);
        return Promise.reject(error);
      }
    };

    await Promise.retry(starter, retry);

    this.isRunning = true;

    await this.events.emit('post-engine-up');
  }

  /**
   * Stop the containerd + buildkitd daemons.
   *
   * 1. Emits `pre-engine-down`.
   * 2. Stops buildkitd (SIGTERM, then SIGKILL after timeout).
   * 3. Stops containerd (SIGTERM, then SIGKILL after timeout).
   * 4. Cleans up PID files.
   * 5. Emits `post-engine-down`.
   *
   * @returns {Promise<void>}
   */
  async down() {
    await this.events.emit('pre-engine-down');

    // macOS: stop the Lima VM
    if (this.platform === 'darwin' && this.lima) {
      try {
        await this.lima.stopVM();
        this.debug('Lima VM stopped');
      } catch (error) {
        this.debug('error stopping Lima VM: %s', error.message);
      }
      this.isRunning = false;
      await this.events.emit('post-engine-down');
      return;
    }

    // Windows without VM support is a no-op for now
    if (this.platform === 'win32') {
      await this.events.emit('post-engine-down');
      return;
    }

    // Stop finch-daemon first
    await this.finchDaemon.stop();

    // Stop buildkitd, then containerd
    await this._stopProcess(this.buildkitdPidFile, 'buildkitd');
    await this._stopProcess(this.containerdPidFile, 'containerd');

    // Clean up sockets if they still exist
    this._cleanupFile(this.buildkitSocket);
    this._cleanupFile(this.socketPath);

    this.isRunning = false;

    await this.events.emit('post-engine-down');
  }

  /**
   * Check whether the containerd engine is currently running and reachable.
   *
   * Uses a short-lived TTL cache (5 seconds) to avoid repeated subprocess
   * spawns, matching the Docker daemon pattern.
   *
   * @param {Object} [cache] - A Lando Cache instance (defaults to `this.cache`).
   * @param {string} [docker] - Path to nerdctl binary (defaults to `this.nerdctlBin`).
   * @returns {Promise<boolean>}
   */
  async isUp(cache, docker) {
    cache = cache ?? this.cache;
    docker = docker ?? this.nerdctlBin;

    // Return cached result if fresh
    if (cache.get('containerd-engineup') === true) return Promise.resolve(true);

    // macOS: check if the Lima VM is running and the socket exists
    if (this.platform === 'darwin' && this.lima) {
      try {
        const running = await this.lima.isRunning();
        if (!running) {
          this.debug('containerd is down: Lima VM "%s" is not running', this.lima.vmName);
          return Promise.resolve(false);
        }

        const socketPath = this.lima.getSocketPath();
        if (!fs.existsSync(socketPath)) {
          this.debug('containerd is down: Lima socket does not exist at %s', socketPath);
          return Promise.resolve(false);
        }

        this.debug('containerd engine is up via Lima VM.');
        cache.set('containerd-engineup', true, {ttl: 5});
        this.isRunning = true;
        this.socketPath = socketPath;
        return Promise.resolve(true);
      } catch (error) {
        this.debug('containerd engine (Lima) is down with error %s', error.message);
        return Promise.resolve(false);
      }
    }

    // Check finch-daemon socket (Docker API compat layer)
    const finchSocket = this.finchDaemon ? this.finchDaemon.getSocketPath() : '/run/lando/finch.sock';
    if (!fs.existsSync(finchSocket)) {
      this.debug('containerd is down: finch socket does not exist at %s', finchSocket);
      return Promise.resolve(false);
    }

    // Health check via Dockerode against finch-daemon socket
    try {
      const Docker = require('dockerode');
      const dockerode = new Docker({socketPath: finchSocket});
      await dockerode.ping();
      this.debug('containerd engine is up (via finch-daemon).');
      cache.set('containerd-engineup', true, {ttl: 5});
      this.isRunning = true;
      return Promise.resolve(true);
    } catch (error) {
      this.debug('containerd engine is down with error %s', error.message);
      return Promise.resolve(false);
    }
  }

  /**
   * Retrieve version information for containerd, buildkit, and nerdctl.
   *
   * @returns {Promise<{containerd: string, buildkit: string, nerdctl: string}>}
   */
  async getVersions() {
    const versions = {containerd: false, buildkit: false, nerdctl: false};
    const runCommand = require('../../../utils/run-command');

    // containerd --version → "containerd containerd.io x.y.z ..."
    try {
      const {stdout} = await runCommand(this.containerdBin, ['--version'], {
        debug: this.debug,
        ignoreReturnCode: true,
      });
      const match = stdout.toString().match(/\d+\.\d+\.\d+/);
      if (match) versions.containerd = match[0];
    } catch {
      this.debug('could not determine containerd version');
    }

    // buildkitd --version → "buildkitd github.com/moby/buildkit x.y.z ..."
    try {
      const {stdout} = await runCommand(this.buildkitdBin, ['--version'], {
        debug: this.debug,
        ignoreReturnCode: true,
      });
      const match = stdout.toString().match(/\d+\.\d+\.\d+/);
      if (match) versions.buildkit = match[0];
    } catch {
      this.debug('could not determine buildkitd version');
    }

    // nerdctl --version → "nerdctl version x.y.z"
    try {
      const {stdout} = await runCommand(this.nerdctlBin, ['--version'], {
        debug: this.debug,
        ignoreReturnCode: true,
      });
      const match = stdout.toString().match(/\d+\.\d+\.\d+/);
      if (match) versions.nerdctl = match[0];
    } catch {
      this.debug('could not determine nerdctl version');
    }

    return versions;
  }

  /**
   * Prune the BuildKit build cache.
   *
   * Runs `buildctl prune --all` to remove all cached build layers. This is
   * useful for reclaiming disk space when caches grow too large.
   *
   * @returns {Promise<void>}
   */
  async pruneBuildCache() {
    const {execSync} = require('child_process');
    try {
      execSync(`"${this.buildctlBin}" prune --all`, {
        stdio: 'pipe',
        env: {...process.env, BUILDKIT_HOST: 'unix://' + this.buildkitSocket},
      });
      this.debug('build cache pruned');
    } catch (err) {
      this.debug('failed to prune build cache: %s', err.message);
    }
  }

  // =========================================================================
  // Private helpers

  /**
   * Ensure the lando-containerd systemd service is active.
   *
   * Checks `systemctl is-active lando-containerd.service` and starts it
   * via `systemctl start` if not active. The service unit is installed
   * by the setup hook.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _ensureSystemdService() {
    const runCommand = require('../../../utils/run-command');

    // Check if the service is already active
    try {
      await runCommand('systemctl', ['is-active', '--quiet', 'lando-containerd.service'], {
        debug: this.debug,
      });
      this.debug('lando-containerd.service is already active');
      return;
    } catch {
      // Not active, try to start it
    }

    this.debug('lando-containerd.service is not active, starting...');
    try {
      await runCommand('systemctl', ['start', 'lando-containerd.service'], {
        debug: this.debug,
      });
      this.debug('lando-containerd.service started');
    } catch (error) {
      throw new Error(
        `Failed to start lando-containerd.service: ${error.message}. ` +
        'Run "lando setup" to install the containerd service.',
      );
    }

    // Wait for the socket to become available
    await this._waitForSocket(this.socketPath, 'containerd', 20);
  }
  // =========================================================================

  /**
   * Assert that the current platform is supported.
   *
   * @throws {Error} If on macOS (Lima not yet integrated) or bare Windows.
   * @private
   */
  _assertPlatformSupported() {
    // macOS is supported via Lima VM integration
    // (handled in up(), down(), and isUp())

    if (this.platform === 'win32') {
      // TODO: Windows support (non-WSL)
      // Options include: WSL2 backend auto-detection, or a Hyper-V based VM
      throw new Error(
        'containerd engine on Windows (non-WSL) is not yet implemented. ' +
        'Please use WSL2 or the Docker backend on Windows for now.',
      );
    }
  }

  /**
   * Create required directories if they don't exist.
   * @private
   */
  _ensureDirectories() {
    for (const dir of [this.runDir, this.stateDir, this.rootDir, this.logDir, this.configDir]) {
      fs.mkdirSync(dir, {recursive: true});
    }
  }

  /**
   * Start the containerd daemon as a background process.
   *
   * @param {string} [password] - Sudo password for elevated execution on Linux.
   * @returns {Promise<void>}
   * @private
   */
  async _startContainerd(password) {
    const timer = this.debugMode ? perfTimer('start-containerd') : null;
    const args = [];

    // Generate and write containerd config for all platforms
    const config = getContainerdConfig({
      socketPath: this.socketPath,
      stateDir: this.stateDir,
      rootDir: this.rootDir,
      debug: this.debugMode,
    });
    fs.writeFileSync(this.configPath, config, 'utf8');
    this.debug('wrote containerd config to %s', this.configPath);
    args.push('--config', this.configPath);

    // On WSL, ensure socket directory permissions
    if (this.wslHelper) {
      await this.wslHelper.ensureSocketPermissions(this.socketPath);
    }

    this.debug('starting containerd: %s %o', this.containerdBin, args);

    if (this.platform === 'linux' && password) {
      // Elevated start for rootful containerd on Linux
      await require('../../../utils/run-elevated')(
        [this.containerdBin, ...args],
        {debug: this.debug, password},
      );
      // run-elevated does not return the child PID; discover it after the socket appears
      await this._waitForSocket(this.socketPath, 'containerd', 20);
      await this._discoverAndRecordPid('containerd', this.containerdPidFile, this.socketPath);
    } else {
      // Spawn as a detached background process, capturing stderr to a log file
      const logFile = path.join(this.logDir, 'containerd.log');
      const stderrFd = fs.openSync(logFile, 'a');
      // Ensure containerd can find shim, runc, and iptables
      const binDir = path.dirname(this.containerdBin);
      const env = {...process.env, PATH: `${binDir}:/usr/sbin:/sbin:${process.env.PATH || ''}`};

      const child = spawn(this.containerdBin, args, {
        detached: true,
        stdio: ['ignore', 'ignore', stderrFd],
        env,
      });
      child.unref();

      // Write PID file
      if (child.pid) {
        fs.writeFileSync(this.containerdPidFile, String(child.pid), 'utf8');
        this.debug('containerd started with pid %d (stderr → %s)', child.pid, logFile);
      }

      // Close our copy of the fd — the child process owns its own copy
      fs.closeSync(stderrFd);
    }

    if (timer) this.debug('%s completed in %.1fms', timer.label, timer.stop());
  }

  /**
   * Start the buildkitd daemon as a background process.
   *
   * @param {string} [password] - Sudo password for elevated execution on Linux.
   * @returns {Promise<void>}
   * @private
   */
  async _startBuildkitd(password) {
    const timer = this.debugMode ? perfTimer('start-buildkitd') : null;
    const args = [];

    // Generate and write BuildKit config
    const config = getBuildkitConfig({
      containerdSocket: this.socketPath,
      buildkitSocket: this.buildkitSocket,
      cacheDir: path.join(this.rootDir, 'buildkit'),
      debug: this.debugMode,
    });
    fs.writeFileSync(this.buildkitConfigPath, config, 'utf8');
    this.debug('wrote buildkit config to %s', this.buildkitConfigPath);
    args.push('--config', this.buildkitConfigPath);

    this.debug('starting buildkitd: %s %o', this.buildkitdBin, args);

    if (this.platform === 'linux' && password) {
      await require('../../../utils/run-elevated')(
        [this.buildkitdBin, ...args],
        {debug: this.debug, password},
      );
      // run-elevated does not return the child PID; discover it after the socket appears
      await this._waitForSocket(this.buildkitSocket, 'buildkitd', 20);
      await this._discoverAndRecordPid('buildkitd', this.buildkitdPidFile, this.buildkitSocket);
    } else {
      // Spawn as a detached background process, capturing stderr to a log file
      const logFile = path.join(this.logDir, 'buildkitd.log');
      const stderrFd = fs.openSync(logFile, 'a');
      const child = spawn(this.buildkitdBin, args, {
        detached: true,
        stdio: ['ignore', 'ignore', stderrFd],
      });
      child.unref();

      if (child.pid) {
        fs.writeFileSync(this.buildkitdPidFile, String(child.pid), 'utf8');
        this.debug('buildkitd started with pid %d (stderr → %s)', child.pid, logFile);
      }

      // Close our copy of the fd — the child process owns its own copy
      fs.closeSync(stderrFd);
    }

    if (timer) this.debug('%s completed in %.1fms', timer.label, timer.stop());
  }

  /**
   * Wait for a Unix socket to appear on disk and optionally verify the daemon
   * is actually listening.
   *
   * For containerd, we run `nerdctl --address <sock> info` to confirm the gRPC
   * server is accepting connections (socket file can exist before the server is
   * ready). For buildkitd, a simple `existsSync` check is sufficient since
   * `_healthCheck()` runs immediately after both sockets are up.
   *
   * @param {string} socketPath - Path to the socket file.
   * @param {string} label - Human-readable name for debug logging.
   * @param {number} [maxAttempts=10] - Maximum poll attempts.
   * @returns {Promise<void>}
   * @private
   */
  async _waitForSocket(socketPath, label, maxAttempts = 10) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Short-circuit: for containerd, we need nerdctl to verify connectivity.
    // If it doesn't exist there's no point polling.
    if (label === 'containerd' && !fs.existsSync(this.nerdctlBin)) {
      throw new Error(`nerdctl binary not found at ${this.nerdctlBin}, cannot verify ${label} socket`);
    }

    for (let i = 0; i < maxAttempts; i++) {
      if (fs.existsSync(socketPath)) {
        // For containerd, verify the daemon is actually accepting connections
        if (label === 'containerd') {
          try {
            const runCommand = require('../../../utils/run-command');
            await runCommand(
              this.nerdctlBin,
              ['--address', socketPath, 'info'],
              {debug: this.debug},
            );
            this.debug('%s socket ready and accepting connections at %s', label, socketPath);
            return;
          } catch {
            this.debug('%s socket exists but daemon not yet accepting connections (attempt %d/%d)',
              label, i + 1, maxAttempts);
          }
        } else {
          // For buildkitd, socket existence is sufficient — _healthCheck() verifies after
          this.debug('%s socket ready at %s', label, socketPath);
          return;
        }
      } else {
        this.debug('waiting for %s socket (attempt %d/%d)...', label, i + 1, maxAttempts);
      }
      await delay(500);
    }

    throw new Error(`${label} socket did not appear at ${socketPath} after ${maxAttempts} attempts`);
  }

  /**
   * Run a quick nerdctl health check to verify the engine is responsive.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _healthCheck() {
    const finchSocket = this.finchDaemon ? this.finchDaemon.getSocketPath() : '/run/lando/finch.sock';
    const Docker = require('dockerode');
    const dockerode = new Docker({socketPath: finchSocket});
    await dockerode.ping();
  }

  /**
   * Check if a process identified by a PID file is currently running.
   *
   * @param {string} pidFile - Path to the PID file.
   * @returns {boolean}
   * @private
   */
  _isProcessRunning(pidFile) {
    try {
      if (!fs.existsSync(pidFile)) return false;
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (isNaN(pid)) return false;
      // Signal 0 tests for process existence without actually sending a signal
      process.kill(pid, 0);
      return true;
    } catch (err) {
      // EPERM = process exists but we lack permission to signal it (e.g. root-owned daemon)
      if (err.code === 'EPERM') return true;
      // ESRCH = no such process, or any other error = not running
      return false;
    }
  }

  /**
   * Stop a process by reading its PID file and sending signals.
   *
   * Sends SIGTERM first, waits up to 10 seconds, then SIGKILL if still alive.
   *
   * @param {string} pidFile - Path to the PID file.
   * @param {string} label - Human-readable process name for debug logging.
   * @returns {Promise<void>}
   * @private
   */
  async _stopProcess(pidFile, label) {
    if (!fs.existsSync(pidFile)) {
      this.debug('%s pid file not found, skipping stop', label);
      return;
    }

    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
    if (isNaN(pid)) {
      this.debug('%s pid file contained invalid pid, cleaning up', label);
      this._cleanupFile(pidFile);
      return;
    }

    // Check if process is actually running
    try {
      process.kill(pid, 0);
    } catch {
      this.debug('%s (pid %d) is not running, cleaning up pid file', label, pid);
      this._cleanupFile(pidFile);
      return;
    }

    // Send SIGTERM
    this.debug('sending SIGTERM to %s (pid %d)', label, pid);
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      this.debug('failed to send SIGTERM to %s: %s', label, error.message);
    }

    // Wait up to 10 seconds for graceful shutdown
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const maxWait = 10;
    for (let i = 0; i < maxWait; i++) {
      await delay(1000);
      try {
        process.kill(pid, 0);
      } catch {
        // Process exited
        this.debug('%s (pid %d) stopped gracefully', label, pid);
        this._cleanupFile(pidFile);
        return;
      }
    }

    // Force kill
    this.debug('sending SIGKILL to %s (pid %d) after %ds timeout', label, pid, maxWait);
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already gone
    }

    // Brief wait for SIGKILL to take effect
    await delay(500);
    this._cleanupFile(pidFile);
    this.debug('%s (pid %d) force-killed', label, pid);
  }

  /**
   * Discover the PID of a running process and write it to a PID file.
   *
   * Used after `run-elevated` starts a daemon as root — the elevated spawn
   * does not return the child's PID directly, so we discover it via `pidof`
   * or `pgrep`.
   *
   * @param {string} processName - Binary name (e.g. 'containerd', 'buildkitd').
   * @param {string} pidFile - Path to write the discovered PID.
   * @param {string} socketPath - Socket path to match against (for pgrep disambiguation).
   * @returns {Promise<void>}
   * @private
   */
  async _discoverAndRecordPid(processName, pidFile, socketPath) {
    const runCommand = require('../../../utils/run-command');

    // Try pidof first (simple, works if only one instance of the binary is running)
    try {
      const {stdout} = await runCommand('pidof', ['-s', processName], {
        debug: this.debug,
        ignoreReturnCode: true,
      });
      const pid = parseInt(stdout.toString().trim(), 10);
      if (!isNaN(pid) && pid > 0) {
        fs.writeFileSync(pidFile, String(pid), 'utf8');
        this.debug('discovered %s pid %d via pidof', processName, pid);
        return;
      }
    } catch {
      this.debug('pidof failed for %s, trying pgrep', processName);
    }

    // Fallback: pgrep with socket path pattern for disambiguation
    try {
      const {stdout} = await runCommand('pgrep', ['-f', `${processName}.*${socketPath}`], {
        debug: this.debug,
        ignoreReturnCode: true,
      });
      const pid = parseInt(stdout.toString().trim().split('\n')[0], 10);
      if (!isNaN(pid) && pid > 0) {
        fs.writeFileSync(pidFile, String(pid), 'utf8');
        this.debug('discovered %s pid %d via pgrep', processName, pid);
        return;
      }
    } catch {
      this.debug('pgrep failed for %s', processName);
    }

    this.debug('could not discover pid for %s — pid file will not be written', processName);
  }

  /**
   * Remove a file if it exists (used for PID and socket cleanup).
   *
   * @param {string} filePath - Path to the file to remove.
   * @private
   */
  _cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.debug('cleaned up %s', filePath);
      }
    } catch (error) {
      this.debug('failed to clean up %s: %s', filePath, error.message);
    }
  }
}

module.exports = ContainerdDaemon;
