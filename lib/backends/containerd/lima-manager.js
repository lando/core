'use strict';

const os = require('os');
const path = require('path');

/**
 * Manages a Lima VM for running containerd on macOS.
 *
 * Lima is a lightweight Linux VM tool designed specifically for running
 * containerd on macOS. This class wraps the `limactl` CLI to create, start,
 * stop, and interact with a Lima VM that hosts the containerd daemon.
 *
 * The VM exposes the containerd socket at:
 *   ~/.lima/<vmName>/sock/containerd.sock
 *
 * @since 4.0.0
 */
class LimaManager {
  /**
   * Create a LimaManager instance.
   *
   * @param {Object}   [opts={}]          - Configuration options.
   * @param {string}   [opts.limactl]     - Path to limactl binary (default: "limactl").
   * @param {string}   [opts.vmName]      - Name of the Lima VM (default: "lando").
   * @param {number}   [opts.cpus]        - CPUs for the VM (default: 4).
   * @param {number}   [opts.memory]      - Memory in GB for the VM (default: 4).
   * @param {number}   [opts.disk]        - Disk in GB for the VM (default: 60).
   * @param {Function} [opts.debug]       - Debug logging function.
   */
  constructor(opts = {}) {
    /** @type {string} Path to the limactl binary. */
    this.limactl = opts.limactl ?? 'limactl';

    /** @type {string} Name of the Lima VM. */
    this.vmName = opts.vmName ?? 'lando';

    /** @type {number} Number of CPUs for the VM. */
    this.cpus = opts.cpus ?? 4;

    /** @type {number} Memory in GB for the VM. */
    this.memory = opts.memory ?? 4;

    /** @type {number} Disk in GB for the VM. */
    this.disk = opts.disk ?? 60;

    /** @type {Function} Debug logging function. */
    this.debug = opts.debug ?? (() => {});
  }

  /**
   * Check if the Lima VM exists.
   *
   * Runs `limactl list --json` and checks for a VM matching `this.vmName`.
   *
   * @returns {Promise<boolean>} True if the VM exists, false otherwise.
   */
  async vmExists() {
    try {
      const result = await this._run(['list', '--json']);
      const vms = this._parseListOutput(result.stdout);
      return vms.some(vm => vm.name === this.vmName);
    } catch (error) {
      this.debug('error checking if Lima VM exists: %s', error.message);
      return false;
    }
  }

  /**
   * Create the Lima VM if it does not already exist.
   *
   * Runs:
   *   limactl create --name=<vmName> --containerd=system \
   *     --cpus=N --memory=N --disk=N --tty=false template:default
   *
   * @returns {Promise<void>}
   * @throws {Error} If VM creation fails.
   */
  async createVM() {
    if (await this.vmExists()) {
      this.debug('Lima VM "%s" already exists, skipping creation', this.vmName);
      return;
    }

    this.debug('creating Lima VM "%s" (cpus=%d, memory=%dG, disk=%dG)',
      this.vmName, this.cpus, this.memory, this.disk);

    await this._run([
      'create',
      `--name=${this.vmName}`,
      '--containerd=system',
      `--cpus=${this.cpus}`,
      `--memory=${this.memory}`,
      `--disk=${this.disk}`,
      '--tty=false',
      'template:default',
    ]);

    this.debug('Lima VM "%s" created successfully', this.vmName);
  }

  /**
   * Start the Lima VM.
   *
   * @returns {Promise<void>}
   * @throws {Error} If the VM cannot be started.
   */
  async startVM() {
    if (await this.isRunning()) {
      this.debug('Lima VM "%s" is already running', this.vmName);
      return;
    }

    this.debug('starting Lima VM "%s"', this.vmName);
    await this._run(['start', this.vmName]);
    this.debug('Lima VM "%s" started', this.vmName);
  }

  /**
   * Stop the Lima VM.
   *
   * @returns {Promise<void>}
   * @throws {Error} If the VM cannot be stopped.
   */
  async stopVM() {
    if (!await this.isRunning()) {
      this.debug('Lima VM "%s" is not running, skipping stop', this.vmName);
      return;
    }

    this.debug('stopping Lima VM "%s"', this.vmName);
    await this._run(['stop', this.vmName]);
    this.debug('Lima VM "%s" stopped', this.vmName);
  }

  /**
   * Check if the Lima VM is currently running.
   *
   * Runs `limactl list --json` and checks if the VM status is "Running".
   *
   * @returns {Promise<boolean>} True if the VM is running, false otherwise.
   */
  async isRunning() {
    try {
      const result = await this._run(['list', '--json']);
      const vms = this._parseListOutput(result.stdout);
      const vm = vms.find(v => v.name === this.vmName);
      return vm?.status === 'Running';
    } catch (error) {
      this.debug('error checking if Lima VM is running: %s', error.message);
      return false;
    }
  }

  /**
   * Get the containerd socket path exposed by Lima.
   *
   * Lima exposes the containerd socket at:
   *   ~/.lima/<vmName>/sock/containerd.sock
   *
   * @returns {string} The full path to the containerd socket.
   */
  getSocketPath() {
    return path.join(os.homedir(), '.lima', this.vmName, 'sock', 'containerd.sock');
  }

  /**
   * Execute a command inside the Lima VM.
   *
   * Runs: limactl shell <vmName> -- <args...>
   *
   * @param {string[]} args - Command and arguments to run inside the VM.
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   * @throws {Error} If the command fails.
   */
  async exec(args) {
    this.debug('executing in Lima VM "%s": %o', this.vmName, args);
    return this._run(['shell', this.vmName, '--', ...args]);
  }

  /**
   * Run nerdctl inside the Lima VM with sudo.
   *
   * Runs: limactl shell <vmName> -- sudo nerdctl <args...>
   *
   * @param {string[]} args - Arguments to pass to nerdctl.
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   * @throws {Error} If the command fails.
   */
  async nerdctl(args) {
    this.debug('running nerdctl in Lima VM "%s": %o', this.vmName, args);
    return this._run(['shell', this.vmName, '--', 'sudo', 'nerdctl', ...args]);
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Run a limactl command via run-command utility.
   *
   * @param {string[]} args - Arguments to pass to limactl.
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   * @private
   */
  async _run(args) {
    const runCommand = require('../../../utils/run-command');
    this.debug('running: %s %o', this.limactl, args);
    return runCommand(this.limactl, args, {debug: this.debug});
  }

  /**
   * Parse the output of `limactl list --json`.
   *
   * limactl outputs one JSON object per line (NDJSON), one per VM.
   *
   * @param {string} stdout - The raw stdout from `limactl list --json`.
   * @returns {Object[]} Array of VM objects with at least { name, status }.
   * @private
   */
  _parseListOutput(stdout) {
    const output = (stdout ?? '').toString().trim();
    if (!output) return [];

    return output.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          this.debug('failed to parse limactl JSON line: %s', line);
          return null;
        }
      })
      .filter(Boolean);
  }
}

module.exports = LimaManager;
