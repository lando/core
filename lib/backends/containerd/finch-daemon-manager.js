'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');

class FinchDaemonManager {
  constructor(opts = {}) {
    const userConfRoot = opts.userConfRoot || path.join(os.homedir(), '.lando');
    this.finchDaemonBin = opts.finchDaemonBin || path.join(userConfRoot, 'bin', 'finch-daemon');
    this.containerdSocket = opts.containerdSocket || '/run/lando/containerd.sock';
    this.socketPath = opts.socketPath || '/run/lando/finch.sock';
    this.pidFile = path.join(userConfRoot, 'run', 'finch-daemon.pid');
    this.logDir = opts.logDir || path.join(userConfRoot, 'logs');
    this.debug = opts.debug || require('../../../utils/debug-shim')(opts.log);
  }

  async start() {
    if (this._isProcessRunning()) {
      this.debug('finch-daemon already running');
      return;
    }

    fs.mkdirSync(path.dirname(this.socketPath), {recursive: true});
    fs.mkdirSync(this.logDir, {recursive: true});

    // Clean up stale socket
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    const args = [
      '--socket-addr', `unix://${this.socketPath}`,
      '--containerd-addr', this.containerdSocket,
      '--socket-owner', String(process.getuid ? process.getuid() : 1000),
      '--debug',
    ];

    this.debug('starting finch-daemon: %s %o', this.finchDaemonBin, args);

    const logFile = path.join(this.logDir, 'finch-daemon.log');
    const stderrFd = fs.openSync(logFile, 'a');
    const child = spawn(this.finchDaemonBin, args, {
      detached: true,
      stdio: ['ignore', 'ignore', stderrFd],
    });
    child.unref();

    if (child.pid) {
      fs.writeFileSync(this.pidFile, String(child.pid), 'utf8');
      this.debug('finch-daemon started with pid %d', child.pid);
    }

    fs.closeSync(stderrFd);
  }

  async stop() {
    if (!fs.existsSync(this.pidFile)) return;

    const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8').trim(), 10);
    if (isNaN(pid)) {
      this._cleanup();
      return;
    }

    try { process.kill(pid, 0); } catch { this._cleanup(); return; }

    try { process.kill(pid, 'SIGTERM'); } catch { /* noop */ }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let i = 0; i < 5; i++) {
      await delay(1000);
      try { process.kill(pid, 0); } catch { this._cleanup(); return; }
    }

    try { process.kill(pid, 'SIGKILL'); } catch { /* noop */ }
    await delay(500);
    this._cleanup();
  }

  async isRunning() {
    if (!this._isProcessRunning()) return false;
    return fs.existsSync(this.socketPath);
  }

  getSocketPath() { return this.socketPath; }

  getStartArgs() {
    return [
      '--socket-addr', `unix://${this.socketPath}`,
      '--containerd-addr', this.containerdSocket,
      '--socket-owner', String(process.getuid ? process.getuid() : 1000),
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
    try { if (fs.existsSync(this.pidFile)) fs.unlinkSync(this.pidFile); } catch { /* noop */ }
    try { if (fs.existsSync(this.socketPath)) fs.unlinkSync(this.socketPath); } catch { /* noop */ }
  }
}

module.exports = FinchDaemonManager;
