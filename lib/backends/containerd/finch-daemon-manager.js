'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');

const getContainerdPaths = require('../../../utils/get-containerd-paths');
const getFinchDaemonConfig = require('../../../utils/get-nerdctl-config');

class FinchDaemonManager {
  constructor(opts = {}) {
    const userConfRoot = opts.userConfRoot || path.join(os.homedir(), '.lando');
    const paths = getContainerdPaths({userConfRoot, ...opts});

    this.finchDaemonBin = opts.finchDaemonBin || path.join(userConfRoot, 'bin', 'finch-daemon');
    this.containerdSocket = opts.containerdSocket || paths.containerdSocket;
    this.socketPath = opts.socketPath || paths.finchSocket;
    this.credentialSocketPath = opts.credentialSocketPath || paths.finchCredentialSocket;
    this.pidFile = path.join(userConfRoot, 'run', 'finch-daemon.pid');
    this.logDir = opts.logDir || path.join(userConfRoot, 'logs');
    this.configDir = opts.configDir || path.join(userConfRoot, 'config');
    this.configPath = opts.configPath || path.join(this.configDir, 'finch-daemon.toml');
    this.namespace = opts.namespace || 'default';
    this.cniNetconfPath = opts.cniNetconfPath || '/etc/cni/net.d/finch';
    this.cniPath = opts.cniPath || '/usr/lib/cni';
    this.debug = opts.debug || require('../../../utils/debug-shim')(opts.log);
  }

  async start() {
    if (this._isProcessRunning()) {
      this.debug('finch-daemon already running');
      return;
    }

    fs.mkdirSync(path.dirname(this.socketPath), {recursive: true});
    fs.mkdirSync(path.dirname(this.pidFile), {recursive: true});
    fs.mkdirSync(this.logDir, {recursive: true});
    fs.mkdirSync(this.configDir, {recursive: true});

    fs.writeFileSync(this.configPath, getFinchDaemonConfig({
      containerdSocket: this.containerdSocket,
      namespace: this.namespace,
      cniNetconfPath: this.cniNetconfPath,
      cniPath: this.cniPath,
    }), 'utf8');

    // Clean up stale socket
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }
    if (fs.existsSync(this.credentialSocketPath)) {
      fs.unlinkSync(this.credentialSocketPath);
    }

    const args = this.getStartArgs();

    this.debug('starting finch-daemon: %s %o', this.finchDaemonBin, args);

    const logFile = path.join(this.logDir, 'finch-daemon.log');
    const stderrFd = fs.openSync(logFile, 'a');
    const child = spawn(this.finchDaemonBin, args, {
      detached: true,
      stdio: ['ignore', 'ignore', stderrFd],
    });
    child.unref();

    if (child.pid) this.debug('finch-daemon spawned with pid %d', child.pid);

    fs.closeSync(stderrFd);
  }

  async stop() {
    if (!fs.existsSync(this.pidFile)) return;

    const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8').trim(), 10);
    if (isNaN(pid)) {
      this._cleanup();
      return;
    }

    try {
      process.kill(pid, 0);
    } catch {
      this._cleanup();
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // noop
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let i = 0; i < 5; i++) {
      await delay(1000);
      try {
        process.kill(pid, 0);
      } catch {
        this._cleanup();
        return;
      }
    }

    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // noop
    }
    await delay(500);
    this._cleanup();
  }

  async isRunning() {
    if (!this._isProcessRunning()) return false;
    return fs.existsSync(this.socketPath);
  }

  getSocketPath() { return this.socketPath; }

  getStartArgs() {
    const owner = String(process.getuid ? process.getuid() : 1000);

    return [
      '--socket-addr', this.socketPath,
      '--socket-owner', owner,
      '--pidfile', this.pidFile,
      '--config-file', this.configPath,
      '--credential-socket-addr', this.credentialSocketPath,
      '--credential-socket-owner', owner,
      '--debug',
    ];
  }

  _isProcessRunning() {
    try {
      if (!fs.existsSync(this.pidFile)) return false;
      const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8').trim(), 10);
      if (isNaN(pid)) return false;
      process.kill(pid, 0);
      return true;
    } catch (err) {
      if (err.code === 'EPERM') return true;
      return false;
    }
  }

  _cleanup() {
    try {
      if (fs.existsSync(this.pidFile)) fs.unlinkSync(this.pidFile);
    } catch {
      // noop
    }
    try {
      if (fs.existsSync(this.socketPath)) fs.unlinkSync(this.socketPath);
    } catch {
      // noop
    }
    try {
      if (fs.existsSync(this.credentialSocketPath)) fs.unlinkSync(this.credentialSocketPath);
    } catch {
      // noop
    }
  }
}

module.exports = FinchDaemonManager;
