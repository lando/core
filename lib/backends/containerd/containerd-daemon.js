'use strict';

const {DaemonBackend} = require('../engine-backend');

const fs = require('fs');
const os = require('os');
const path = require('path');

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
 * Manages Lando's **own isolated** containerd + buildkitd + finch-daemon stack.
 * On Linux/WSL, all root-level operations (starting daemons, creating sockets,
 * managing CNI, etc.) are handled by the `lando-containerd.service` systemd
 * unit installed during `lando setup`. At runtime, a normal user in the `lando`
 * group simply verifies the service is active and the sockets are responsive —
 * no sudo or elevated privileges are needed.
 *
 * | Path                              | Purpose                       |
 * |-----------------------------------|-------------------------------|
 * | `/run/lando/containerd.sock`      | containerd gRPC socket        |
 * | `/run/lando/buildkitd.sock`       | buildkitd gRPC socket         |
 * | `/run/lando/finch.sock`           | finch-daemon Docker API sock  |
 * | `~/.lando/config/`                | containerd/buildkit configs    |
 * | `~/.lando/state/containerd/`      | containerd state directory    |
 * | `~/.lando/data/containerd/`       | containerd root (images, etc) |
 *
 * Platform notes:
 * - **Linux/WSL**: systemd service owns all daemons; user just talks to sockets.
 * - **macOS (darwin)**: runs inside a Lima VM with containerd enabled.
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
    // containerd/buildkitd live in the system-wide Lando bin dir (installed by setup hook)
    const systemBinDir = opts.systemBinDir ?? '/usr/local/lib/lando/bin';
    // User-local binaries (nerdctl) stay under ~/.lando/bin
    const binDir = path.join(userConfRoot, 'bin');

    /** @type {string} Path to the containerd binary (system-wide). */
    this.containerdBin = opts.containerdBin ?? path.join(systemBinDir, 'containerd');

    /** @type {string} Path to the buildkitd binary. */
    this.buildkitdBin = opts.buildkitdBin ?? path.join(systemBinDir, 'buildkitd');

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

    // Directories
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

    // Config paths (written by setup, read at runtime)
    this.configDir = path.join(userConfRoot, 'config');
    this.configPath = path.join(this.configDir, 'containerd-config.toml');
    this.buildkitConfigPath = path.join(this.configDir, 'buildkit-config.toml');

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
   * Verify that the lando-containerd systemd service is active and all
   * sockets are responsive. No daemons are spawned — the systemd service
   * owns all of that.
   *
   * @param {boolean|Object} [retry=true] - Retry configuration.
   * @returns {Promise<void>}
   */
  async up(retry = true) {
    // Normalize retry opts (same pattern as Docker daemon)
    if (retry === true) retry = {max: 25, backoff: 1000};
    else if (retry === false) retry = {max: 0};

    // Platform guard
    this._assertPlatformSupported();

    // Short-circuit: if the containerd binary doesn't exist, there's nothing to start
    if (this.platform !== 'darwin' && !fs.existsSync(this.containerdBin)) {
      throw new Error(`containerd binary not found at ${this.containerdBin}, skipping start`);
    }

    await this.events.emit('pre-engine-up');

    // macOS: delegate to Lima VM
    if (this.platform === 'darwin' && this.lima) {
      const limaStarter = async () => {
        try {
          await this.lima.createVM();
          await this.lima.startVM();
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

    // Ensure user-level directories exist
    this._ensureDirectories();

    // Verify systemd service is active and sockets are responsive
    const starter = async () => {
      const isUp = await this.isUp();
      if (isUp) return Promise.resolve();

      const upTimer = this.debugMode ? perfTimer('containerd-engine-up') : null;

      try {
        // Check that the systemd service is active
        const runCommand = require('../../../utils/run-command');
        try {
          await runCommand('systemctl', ['is-active', '--quiet', 'lando-containerd.service'], {
            debug: this.debug,
          });
        } catch {
          throw new Error(
            'lando-containerd.service is not active. ' +
            'Run "lando setup" to install and start the containerd engine service.',
          );
        }

        // Verify all three sockets exist and are responsive
        await this._waitForSocket(this.socketPath, 'containerd', 10);
        await this._healthCheck();
        await this._waitForSocket(this.buildkitSocket, 'buildkitd', 10);
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
   * Shut down the containerd engine from Lando's perspective.
   *
   * On Linux/WSL the systemd service keeps running for fast restart —
   * we just emit events and update state. On macOS the Lima VM is stopped.
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

    // Linux/WSL: systemd service keeps running — just update state
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

    if (!fs.existsSync(this.socketPath)) {
      this.debug('containerd is down: containerd socket does not exist at %s', this.socketPath);
      return Promise.resolve(false);
    }

    if (!fs.existsSync(this.buildkitSocket)) {
      this.debug('containerd is down: buildkit socket does not exist at %s', this.buildkitSocket);
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
   * Assert that the current platform is supported.
   *
   * @throws {Error} If on bare Windows (non-WSL).
   * @private
   */
  _assertPlatformSupported() {
    if (this.platform === 'win32') {
      throw new Error(
        'containerd engine on Windows (non-WSL) is not yet implemented. ' +
        'Please use WSL2 or the Docker backend on Windows for now.',
      );
    }
  }

  /**
   * Create required user-level directories if they don't exist.
   * @private
   */
  _ensureDirectories() {
    for (const dir of [this.stateDir, this.rootDir, this.logDir, this.configDir]) {
      fs.mkdirSync(dir, {recursive: true});
    }
  }

  /**
   * Check whether this environment uses the systemd-managed service.
   *
   * @returns {boolean}
   * @private
   */
  _usesSystemdService() {
    return ['linux', 'wsl'].includes(this.platform) && fs.existsSync('/etc/systemd/system/lando-containerd.service');
  }

  /**
   * Wait for a Unix socket to appear on disk.
   *
   * Polls for socket file existence. Actual daemon liveness is verified
   * separately by `_healthCheck()` (Dockerode ping against finch-daemon).
   *
   * @param {string} socketPath - Path to the socket file.
   * @param {string} label - Human-readable name for debug logging.
   * @param {number} [maxAttempts=10] - Maximum poll attempts.
   * @returns {Promise<void>}
   * @private
   */
  async _waitForSocket(socketPath, label, maxAttempts = 10) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < maxAttempts; i++) {
      if (fs.existsSync(socketPath)) {
        this.debug('%s socket ready at %s', label, socketPath);
        return;
      }
      this.debug('waiting for %s socket (attempt %d/%d)...', label, i + 1, maxAttempts);
      await delay(500);
    }

    throw new Error(`${label} socket did not appear at ${socketPath} after ${maxAttempts} attempts`);
  }

  /**
   * Run a quick health check via Dockerode against finch-daemon to verify
   * the engine is responsive.
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
   * Remove a file if it exists (used for cleanup).
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
