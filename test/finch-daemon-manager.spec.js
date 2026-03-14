/*
 * Tests for finch-daemon-manager.
 * @file finch-daemon-manager.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

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
      const expected = path.join(os.homedir(), '.lando', 'run', 'finch.sock');
      mgr.socketPath.should.equal(expected);
    });

    it('should set correct default containerd socket', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      const expected = path.join(os.homedir(), '.lando', 'run', 'containerd.sock');
      mgr.containerdSocket.should.equal(expected);
    });

    it('should set correct default pid file', () => {
      const mgr = new FinchDaemonManager({debug: noopDebug});
      const expected = path.join(os.homedir(), '.lando', 'run', 'finch-daemon.pid');
      mgr.pidFile.should.equal(expected);
    });
  });

  describe('#constructor custom options', () => {
    it('should accept custom userConfRoot', () => {
      const mgr = new FinchDaemonManager({userConfRoot: '/custom/root', debug: noopDebug});
      mgr.finchDaemonBin.should.equal(path.join('/custom/root', 'bin', 'finch-daemon'));
      mgr.socketPath.should.equal(path.join('/custom/root', 'run', 'finch.sock'));
      mgr.containerdSocket.should.equal(path.join('/custom/root', 'run', 'containerd.sock'));
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
      const expected = path.join(os.homedir(), '.lando', 'run', 'finch.sock');
      mgr.getSocketPath().should.equal(expected);
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
      args.length.should.equal(7);
    });

    it('should include --socket-addr with unix:// prefix', () => {
      const mgr = new FinchDaemonManager({socketPath: '/tmp/finch.sock', debug: noopDebug});
      const args = mgr.getStartArgs();
      const idx = args.indexOf('--socket-addr');
      expect(idx).to.not.equal(-1);
      args[idx + 1].should.equal('unix:///tmp/finch.sock');
    });

    it('should include --containerd-addr with containerd socket', () => {
      const mgr = new FinchDaemonManager({containerdSocket: '/tmp/containerd.sock', debug: noopDebug});
      const args = mgr.getStartArgs();
      const idx = args.indexOf('--containerd-addr');
      expect(idx).to.not.equal(-1);
      args[idx + 1].should.equal('/tmp/containerd.sock');
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
});
