/*
 * Tests for finch-daemon-manager.
 * @file finch-daemon-manager.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const sinon = require('sinon');
const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const os = require('os');
const FinchDaemonManager = require('./../lib/backends/containerd/finch-daemon-manager');

// Provide a noop debug function so tests don't need a real Lando Log instance
const noopDebug = () => {};

describe('finch-daemon-manager', () => {
  describe('#constructor defaults', () => {
    it('should set correct default bin path', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      const expected = path.join(os.homedir(), '.lando', 'bin', 'finch-daemon');
      mgr.finchDaemonBin.should.equal(expected);
    });

    it('should set correct default socket path', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      mgr.socketPath.should.equal('/run/lando/finch.sock');
    });

    it('should set correct default containerd socket', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      mgr.containerdSocket.should.equal('/run/lando/containerd.sock');
    });

    it('should set correct default pid file', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      const expected = path.join(os.homedir(), '.lando', 'run', 'finch-daemon.pid');
      mgr.pidFile.should.equal(expected);
    });

    it('should set correct default CNI plugin path', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      mgr.cniPath.should.equal('/usr/local/lib/lando/cni/bin');
    });
  });

  describe('#constructor custom options', () => {
    it('should accept custom userConfRoot', () => {
      const mgr = new FinchDaemonManager({userConfRoot: '/custom/root', debug: noopDebug});
      mgr.finchDaemonBin.should.equal(path.join('/custom/root', 'bin', 'finch-daemon'));
      // socketPath and containerdSocket now default to /run/lando/ (not userConfRoot)
      mgr.socketPath.should.equal('/run/lando/finch.sock');
      mgr.containerdSocket.should.equal('/run/lando/containerd.sock');
      mgr.pidFile.should.equal(path.join('/custom/root', 'run', 'finch-daemon.pid'));
    });

    it('should accept custom finchDaemonBin', () => {
      const mgr = new FinchDaemonManager({finchDaemonBin: '/usr/local/bin/finch-daemon', debug: noopDebug});
      mgr.finchDaemonBin.should.equal('/usr/local/bin/finch-daemon');
    });

    it('should accept custom socketPath', () => {
      const mgr = new FinchDaemonManager({socketPath: '/tmp/finch.sock', debug: noopDebug});
      mgr.socketPath.should.equal('/tmp/finch.sock');
    });

    it('should accept custom containerdSocket', () => {
      const mgr = new FinchDaemonManager({containerdSocket: '/tmp/containerd.sock', debug: noopDebug});
      mgr.containerdSocket.should.equal('/tmp/containerd.sock');
    });

    it('should accept custom logDir', () => {
      const mgr = new FinchDaemonManager({logDir: '/tmp/logs', debug: noopDebug});
      mgr.logDir.should.equal('/tmp/logs');
    });
  });

  describe('#getSocketPath', () => {
    it('should return the configured socket path', () => {
      const mgr = new FinchDaemonManager({socketPath: '/var/run/finch.sock', debug: noopDebug});
      mgr.getSocketPath().should.equal('/var/run/finch.sock');
    });

    it('should return default socket path when no custom path given', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      mgr.getSocketPath().should.equal('/run/lando/finch.sock');
    });
  });

  describe('#getStartArgs', () => {
    it('should return correct args array', () => {
      const mgr = new FinchDaemonManager({
        socketPath: '/tmp/finch.sock',
        containerdSocket: '/tmp/containerd.sock',
        debug: noopDebug,
      });
      const args = mgr.getStartArgs();
      expect(args).to.be.an('array');
      args.length.should.equal(13);
    });

    it('should include --socket-addr with plain socket path', () => {
      const mgr = new FinchDaemonManager({socketPath: '/tmp/finch.sock', debug: noopDebug});
      const args = mgr.getStartArgs();
      const idx = args.indexOf('--socket-addr');
      expect(idx).to.not.equal(-1);
      args[idx + 1].should.equal('/tmp/finch.sock');
    });

    it('should include --config-file for the finch-daemon config', () => {
      const mgr = new FinchDaemonManager({containerdSocket: '/tmp/containerd.sock', debug: noopDebug});
      const args = mgr.getStartArgs();
      const idx = args.indexOf('--config-file');
      expect(idx).to.not.equal(-1);
      args[idx + 1].should.match(/finch-daemon\.toml$/);
    });

    it('should include credential socket args', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      const args = mgr.getStartArgs();
      expect(args).to.include('--credential-socket-addr');
      expect(args).to.include('--credential-socket-owner');
    });

    it('should include --socket-owner', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      const args = mgr.getStartArgs();
      const idx = args.indexOf('--socket-owner');
      expect(idx).to.not.equal(-1);
      const owner = args[idx + 1];
      expect(owner).to.be.a('string');
      parseInt(owner, 10).should.be.a('number');
    });

    it('should include --debug flag', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      const args = mgr.getStartArgs();
      expect(args).to.include('--debug');
    });
  });

  // --- Lifecycle tests requiring mock-fs and sinon ---

  describe('#_isProcessRunning', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;
    const testConfRoot = '/tmp/test-finch-mgr';

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it('should return false when no PID file exists', () => {
      mockFs({[testConfRoot]: {}});

      const mgr = new FinchDaemonManager({userConfRoot: testConfRoot, debug: noopDebug});
      expect(mgr._isProcessRunning()).to.be.false;
    });

    it('should return false when PID file contains non-numeric data', () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': 'not-a-number\n',
        },
      });

      const mgr = new FinchDaemonManager({userConfRoot: testConfRoot, debug: noopDebug});
      expect(mgr._isProcessRunning()).to.be.false;
    });

    it('should return true when process.kill(pid, 0) succeeds', () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '12345',
        },
      });

      sandbox.stub(process, 'kill').returns(true);

      const mgr = new FinchDaemonManager({userConfRoot: testConfRoot, debug: noopDebug});
      expect(mgr._isProcessRunning()).to.be.true;
    });

    it('should return false when process.kill(pid, 0) throws ESRCH', () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '99999',
        },
      });

      const esrchErr = new Error('ESRCH');
      esrchErr.code = 'ESRCH';
      sandbox.stub(process, 'kill').throws(esrchErr);

      const mgr = new FinchDaemonManager({userConfRoot: testConfRoot, debug: noopDebug});
      expect(mgr._isProcessRunning()).to.be.false;
    });

    it('should return true when process.kill throws EPERM (running as different user)', () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '12345',
        },
      });

      const epermErr = new Error('EPERM');
      epermErr.code = 'EPERM';
      sandbox.stub(process, 'kill').throws(epermErr);

      const mgr = new FinchDaemonManager({userConfRoot: testConfRoot, debug: noopDebug});
      expect(mgr._isProcessRunning()).to.be.true;
    });
  });

  describe('#start', () => {
    // NOTE: start() uses `const {spawn} = require('child_process')` which captures
    // the reference at import time. Without proxyquire/rewire, we cannot intercept
    // the spawn call via sinon. Tests here cover the early-return path and
    // pre-spawn setup behavior that can be verified without mocking spawn.

    /** @type {sinon.SinonSandbox} */
    let sandbox;
    const testConfRoot = '/tmp/test-finch-start';
    const testSocketDir = '/tmp/test-finch-sockets';

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it('should return early without side effects if already running', async () => {
      mockFs({
        [testSocketDir]: {},
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '12345',
        },
      });

      sandbox.stub(process, 'kill').returns(true);

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      await mgr.start();

      // Config file should NOT have been written (early return before any setup)
      expect(fs.existsSync(mgr.configPath)).to.be.false;
    });

    it('should generate correct start args including all required flags', () => {
      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      const args = mgr.getStartArgs();

      // Verify all critical args are present and paired correctly
      const flagPairs = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
          flagPairs[args[i]] = args[i + 1];
        }
      }

      expect(flagPairs['--socket-addr']).to.equal(path.join(testSocketDir, 'finch.sock'));
      expect(flagPairs['--pidfile']).to.equal(path.join(testConfRoot, 'run', 'finch-daemon.pid'));
      expect(flagPairs['--config-file']).to.equal(path.join(testConfRoot, 'config', 'finch-daemon.toml'));
      expect(flagPairs['--credential-socket-addr']).to.equal(
        path.join(testSocketDir, 'finch-credential.sock'),
      );
      expect(args).to.include('--debug');
    });
  });

  describe('#stop', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;
    const testConfRoot = '/tmp/test-finch-stop';
    const testSocketDir = '/tmp/test-finch-stop-sockets';

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it('should do nothing if no PID file exists', async () => {
      mockFs({[testConfRoot]: {}});

      const killStub = sandbox.stub(process, 'kill');
      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      await mgr.stop();

      expect(killStub.called).to.be.false;
    });

    it('should clean up if PID file has invalid content', async () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': 'garbage',
        },
      });

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      await mgr.stop();

      expect(fs.existsSync(mgr.pidFile)).to.be.false;
    });

    it('should clean up if process is already gone', async () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '99999',
        },
      });

      const esrchErr = new Error('ESRCH');
      esrchErr.code = 'ESRCH';
      sandbox.stub(process, 'kill').throws(esrchErr);

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      await mgr.stop();

      expect(fs.existsSync(mgr.pidFile)).to.be.false;
    });

    it('should send SIGTERM to running process and clean up', async () => {
      const clock = sandbox.useFakeTimers();

      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '12345',
        },
        [testSocketDir]: {
          'finch.sock': '',
          'finch-credential.sock': '',
        },
      });

      const esrchErr = new Error('ESRCH');
      esrchErr.code = 'ESRCH';
      let sigTermSent = false;
      const killStub = sandbox.stub(process, 'kill').callsFake((pid, signal) => {
        if (signal === 'SIGTERM') {
          sigTermSent = true;
          return true;
        }
        // signal 0 = existence check: succeed before SIGTERM, throw ESRCH after
        if (signal === 0) {
          if (sigTermSent) throw esrchErr;
          return true;
        }
        return true;
      });

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });

      const stopPromise = mgr.stop();
      clock.tick(1000);
      await stopPromise;

      const sigtermCall = killStub.getCalls().find(c => c.args[1] === 'SIGTERM');
      expect(sigtermCall).to.exist;
      expect(sigtermCall.args[0]).to.equal(12345);

      // Verify cleanup was performed after graceful shutdown
      expect(fs.existsSync(mgr.pidFile)).to.be.false;
      expect(fs.existsSync(mgr.socketPath)).to.be.false;
      expect(fs.existsSync(mgr.credentialSocketPath)).to.be.false;
    });
  });

  describe('#isRunning', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;
    const testConfRoot = '/tmp/test-finch-running';
    const testSocketDir = '/tmp/test-finch-running-sockets';

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it('should return false when process is not running', async () => {
      mockFs({[testConfRoot]: {}});

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      const result = await mgr.isRunning();
      expect(result).to.be.false;
    });

    it('should return false when process runs but socket is missing', async () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '12345',
        },
      });

      sandbox.stub(process, 'kill').returns(true);

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      const result = await mgr.isRunning();
      expect(result).to.be.false;
    });

    it('should return true when process runs and socket exists', async () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '12345',
        },
        [testSocketDir]: {
          'finch.sock': '',
        },
      });

      sandbox.stub(process, 'kill').returns(true);

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      const result = await mgr.isRunning();
      expect(result).to.be.true;
    });
  });

  describe('#_cleanup', () => {
    const testConfRoot = '/tmp/test-finch-cleanup';
    const testSocketDir = '/tmp/test-finch-cleanup-sockets';

    afterEach(() => {
      mockFs.restore();
    });

    it('should remove PID file, socket, and credential socket', () => {
      mockFs({
        [path.join(testConfRoot, 'run')]: {
          'finch-daemon.pid': '12345',
        },
        [testSocketDir]: {
          'finch.sock': '',
          'finch-credential.sock': '',
        },
      });

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      mgr._cleanup();

      expect(fs.existsSync(mgr.pidFile)).to.be.false;
      expect(fs.existsSync(mgr.socketPath)).to.be.false;
      expect(fs.existsSync(mgr.credentialSocketPath)).to.be.false;
    });

    it('should not throw when files do not exist', () => {
      mockFs({[testConfRoot]: {}});

      const mgr = new FinchDaemonManager({
        userConfRoot: testConfRoot,
        socketPath: path.join(testSocketDir, 'finch.sock'),
        credentialSocketPath: path.join(testSocketDir, 'finch-credential.sock'),
        debug: noopDebug,
      });
      expect(() => mgr._cleanup()).to.not.throw();
    });
  });
});
