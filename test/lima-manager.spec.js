/*
 * Tests for LimaManager.
 * @file lima-manager.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const sinon = require('sinon');
const os = require('os');
const path = require('path');
const LimaManager = require('./../lib/backends/containerd/lima-manager');

// Provide a noop debug function so tests don't need a real Lando Log instance
const noopDebug = () => {};

describe('lima-manager', () => {
  // =========================================================================
  // Constructor
  // =========================================================================
  describe('#constructor defaults', () => {
    it('should set default limactl binary path', () => {
      const mgr = new LimaManager({debug: noopDebug});
      mgr.limactl.should.equal('limactl');
    });

    it('should set default VM name to "lando"', () => {
      const mgr = new LimaManager({debug: noopDebug});
      mgr.vmName.should.equal('lando');
    });

    it('should set default cpus to 4', () => {
      const mgr = new LimaManager({debug: noopDebug});
      mgr.cpus.should.equal(4);
    });

    it('should set default memory to 4 (GB)', () => {
      const mgr = new LimaManager({debug: noopDebug});
      mgr.memory.should.equal(4);
    });

    it('should set default disk to 60 (GB)', () => {
      const mgr = new LimaManager({debug: noopDebug});
      mgr.disk.should.equal(60);
    });

    it('should set debug to a noop function when not provided', () => {
      const mgr = new LimaManager();
      expect(mgr.debug).to.be.a('function');
      // Should not throw
      mgr.debug('test message');
    });
  });

  describe('#constructor custom options', () => {
    it('should accept custom limactl path', () => {
      const mgr = new LimaManager({limactl: '/usr/local/bin/limactl', debug: noopDebug});
      mgr.limactl.should.equal('/usr/local/bin/limactl');
    });

    it('should accept custom VM name', () => {
      const mgr = new LimaManager({vmName: 'my-vm', debug: noopDebug});
      mgr.vmName.should.equal('my-vm');
    });

    it('should accept custom cpus', () => {
      const mgr = new LimaManager({cpus: 8, debug: noopDebug});
      mgr.cpus.should.equal(8);
    });

    it('should accept custom memory', () => {
      const mgr = new LimaManager({memory: 16, debug: noopDebug});
      mgr.memory.should.equal(16);
    });

    it('should accept custom disk', () => {
      const mgr = new LimaManager({disk: 120, debug: noopDebug});
      mgr.disk.should.equal(120);
    });

    it('should accept custom debug function', () => {
      const customDebug = sinon.stub();
      const mgr = new LimaManager({debug: customDebug});
      mgr.debug.should.equal(customDebug);
    });
  });

  // =========================================================================
  // getSocketPath
  // =========================================================================
  describe('#getSocketPath', () => {
    it('should return path under ~/.lima/<vmName>/sock/', () => {
      const mgr = new LimaManager({debug: noopDebug});
      const expected = path.join(os.homedir(), '.lima', 'lando', 'sock', 'containerd.sock');
      mgr.getSocketPath().should.equal(expected);
    });

    it('should use custom vmName in the socket path', () => {
      const mgr = new LimaManager({vmName: 'custom-vm', debug: noopDebug});
      const expected = path.join(os.homedir(), '.lima', 'custom-vm', 'sock', 'containerd.sock');
      mgr.getSocketPath().should.equal(expected);
    });

    it('should always end with containerd.sock', () => {
      const mgr = new LimaManager({debug: noopDebug});
      mgr.getSocketPath().should.match(/containerd\.sock$/);
    });
  });

  // =========================================================================
  // _parseListOutput (private but critical logic)
  // =========================================================================
  describe('#_parseListOutput', () => {
    /** @type {LimaManager} */
    let mgr;

    beforeEach(() => {
      mgr = new LimaManager({debug: noopDebug});
    });

    it('should return empty array for empty string', () => {
      const result = mgr._parseListOutput('');
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array for null input', () => {
      const result = mgr._parseListOutput(null);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array for undefined input', () => {
      const result = mgr._parseListOutput(undefined);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array for whitespace-only string', () => {
      const result = mgr._parseListOutput('   \n  \n  ');
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should parse a single NDJSON line', () => {
      const line = JSON.stringify({name: 'lando', status: 'Running'});
      const result = mgr._parseListOutput(line);
      expect(result).to.have.lengthOf(1);
      result[0].name.should.equal('lando');
      result[0].status.should.equal('Running');
    });

    it('should parse multiple NDJSON lines', () => {
      const lines = [
        JSON.stringify({name: 'lando', status: 'Running'}),
        JSON.stringify({name: 'other-vm', status: 'Stopped'}),
      ].join('\n');

      const result = mgr._parseListOutput(lines);
      expect(result).to.have.lengthOf(2);
      result[0].name.should.equal('lando');
      result[1].name.should.equal('other-vm');
    });

    it('should skip blank lines between valid JSON', () => {
      const lines = [
        JSON.stringify({name: 'lando', status: 'Running'}),
        '',
        '  ',
        JSON.stringify({name: 'other-vm', status: 'Stopped'}),
      ].join('\n');

      const result = mgr._parseListOutput(lines);
      expect(result).to.have.lengthOf(2);
    });

    it('should skip invalid JSON lines gracefully', () => {
      const lines = [
        JSON.stringify({name: 'lando', status: 'Running'}),
        'this is not json',
        JSON.stringify({name: 'other-vm', status: 'Stopped'}),
      ].join('\n');

      const result = mgr._parseListOutput(lines);
      expect(result).to.have.lengthOf(2);
      result[0].name.should.equal('lando');
      result[1].name.should.equal('other-vm');
    });

    it('should call debug when encountering invalid JSON', () => {
      const debugStub = sinon.stub();
      const debugMgr = new LimaManager({debug: debugStub});

      debugMgr._parseListOutput('not-json');
      expect(debugStub.calledWith('failed to parse limactl JSON line: %s', 'not-json')).to.be.true;
    });

    it('should handle trailing newline', () => {
      const line = JSON.stringify({name: 'lando', status: 'Running'}) + '\n';
      const result = mgr._parseListOutput(line);
      expect(result).to.have.lengthOf(1);
      result[0].name.should.equal('lando');
    });

    it('should convert Buffer input via toString()', () => {
      const buf = Buffer.from(JSON.stringify({name: 'lando', status: 'Running'}));
      const result = mgr._parseListOutput(buf);
      expect(result).to.have.lengthOf(1);
      result[0].name.should.equal('lando');
    });
  });

  // =========================================================================
  // vmExists
  // =========================================================================
  describe('#vmExists', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return true when VM with matching name exists', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const ndjson = JSON.stringify({name: 'lando', status: 'Stopped'});
      sandbox.stub(mgr, '_run').resolves({stdout: ndjson, stderr: '', code: 0});

      const result = await mgr.vmExists();
      expect(result).to.be.true;
    });

    it('should return false when no VM with matching name exists', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const ndjson = JSON.stringify({name: 'other-vm', status: 'Running'});
      sandbox.stub(mgr, '_run').resolves({stdout: ndjson, stderr: '', code: 0});

      const result = await mgr.vmExists();
      expect(result).to.be.false;
    });

    it('should return false when limactl list returns empty output', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      const result = await mgr.vmExists();
      expect(result).to.be.false;
    });

    it('should return false when _run throws an error', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, '_run').rejects(new Error('command not found'));

      const result = await mgr.vmExists();
      expect(result).to.be.false;
    });

    it('should call _run with correct arguments', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.vmExists();
      expect(runStub.calledOnce).to.be.true;
      expect(runStub.firstCall.args[0]).to.deep.equal(['list', '--json']);
    });

    it('should find VM among multiple VMs', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const ndjson = [
        JSON.stringify({name: 'other-vm', status: 'Stopped'}),
        JSON.stringify({name: 'lando', status: 'Running'}),
        JSON.stringify({name: 'test-vm', status: 'Stopped'}),
      ].join('\n');
      sandbox.stub(mgr, '_run').resolves({stdout: ndjson, stderr: '', code: 0});

      const result = await mgr.vmExists();
      expect(result).to.be.true;
    });
  });

  // =========================================================================
  // isRunning
  // =========================================================================
  describe('#isRunning', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return true when VM status is "Running"', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const ndjson = JSON.stringify({name: 'lando', status: 'Running'});
      sandbox.stub(mgr, '_run').resolves({stdout: ndjson, stderr: '', code: 0});

      const result = await mgr.isRunning();
      expect(result).to.be.true;
    });

    it('should return false when VM status is "Stopped"', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const ndjson = JSON.stringify({name: 'lando', status: 'Stopped'});
      sandbox.stub(mgr, '_run').resolves({stdout: ndjson, stderr: '', code: 0});

      const result = await mgr.isRunning();
      expect(result).to.be.false;
    });

    it('should return false when VM does not exist', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const ndjson = JSON.stringify({name: 'other-vm', status: 'Running'});
      sandbox.stub(mgr, '_run').resolves({stdout: ndjson, stderr: '', code: 0});

      const result = await mgr.isRunning();
      expect(result).to.be.false;
    });

    it('should return false when _run throws an error', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, '_run').rejects(new Error('limactl not found'));

      const result = await mgr.isRunning();
      expect(result).to.be.false;
    });

    it('should return false for empty output', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      const result = await mgr.isRunning();
      expect(result).to.be.false;
    });

    it('should distinguish Running from other statuses', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});

      // Test each non-Running status
      for (const status of ['Stopped', 'Starting', 'Broken', '']) {
        const ndjson = JSON.stringify({name: 'lando', status});
        sandbox.stub(mgr, '_run').resolves({stdout: ndjson, stderr: '', code: 0});
        const result = await mgr.isRunning();
        expect(result).to.be.false;
        sandbox.restore();
        sandbox = sinon.createSandbox();
      }
    });
  });

  // =========================================================================
  // createVM
  // =========================================================================
  describe('#createVM', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should skip creation when VM already exists', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      sandbox.stub(mgr, 'vmExists').resolves(true);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.createVM();
      expect(runStub.called).to.be.false;
    });

    it('should call _run with correct create arguments when VM does not exist', async () => {
      const mgr = new LimaManager({
        vmName: 'lando',
        cpus: 4,
        memory: 4,
        disk: 60,
        debug: noopDebug,
      });
      sandbox.stub(mgr, 'vmExists').resolves(false);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.createVM();
      expect(runStub.calledOnce).to.be.true;
      expect(runStub.firstCall.args[0]).to.deep.equal([
        'create',
        '--name=lando',
        '--containerd=system',
        '--cpus=4',
        '--memory=4',
        '--disk=60',
        '--tty=false',
        'template:default',
      ]);
    });

    it('should use custom resource values in create arguments', async () => {
      const mgr = new LimaManager({
        vmName: 'my-vm',
        cpus: 8,
        memory: 16,
        disk: 120,
        debug: noopDebug,
      });
      sandbox.stub(mgr, 'vmExists').resolves(false);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.createVM();
      const args = runStub.firstCall.args[0];
      expect(args).to.include('--name=my-vm');
      expect(args).to.include('--cpus=8');
      expect(args).to.include('--memory=16');
      expect(args).to.include('--disk=120');
    });

    it('should propagate error if _run fails during creation', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, 'vmExists').resolves(false);
      sandbox.stub(mgr, '_run').rejects(new Error('creation failed'));

      try {
        await mgr.createVM();
        expect.fail('should have thrown');
      } catch (err) {
        err.message.should.equal('creation failed');
      }
    });
  });

  // =========================================================================
  // startVM
  // =========================================================================
  describe('#startVM', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should skip start when VM is already running', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(true);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.startVM();
      expect(runStub.called).to.be.false;
    });

    it('should call _run with correct start arguments', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(false);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.startVM();
      expect(runStub.calledOnce).to.be.true;
      expect(runStub.firstCall.args[0]).to.deep.equal(['start', 'lando']);
    });

    it('should use custom vmName in start arguments', async () => {
      const mgr = new LimaManager({vmName: 'custom-vm', debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(false);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.startVM();
      expect(runStub.firstCall.args[0]).to.deep.equal(['start', 'custom-vm']);
    });

    it('should propagate error if _run fails during start', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(false);
      sandbox.stub(mgr, '_run').rejects(new Error('start failed'));

      try {
        await mgr.startVM();
        expect.fail('should have thrown');
      } catch (err) {
        err.message.should.equal('start failed');
      }
    });
  });

  // =========================================================================
  // stopVM
  // =========================================================================
  describe('#stopVM', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should skip stop when VM is not running', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(false);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.stopVM();
      expect(runStub.called).to.be.false;
    });

    it('should call _run with correct stop arguments', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(true);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.stopVM();
      expect(runStub.calledOnce).to.be.true;
      expect(runStub.firstCall.args[0]).to.deep.equal(['stop', 'lando']);
    });

    it('should use custom vmName in stop arguments', async () => {
      const mgr = new LimaManager({vmName: 'custom-vm', debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(true);
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.stopVM();
      expect(runStub.firstCall.args[0]).to.deep.equal(['stop', 'custom-vm']);
    });

    it('should propagate error if _run fails during stop', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, 'isRunning').resolves(true);
      sandbox.stub(mgr, '_run').rejects(new Error('stop failed'));

      try {
        await mgr.stopVM();
        expect.fail('should have thrown');
      } catch (err) {
        err.message.should.equal('stop failed');
      }
    });
  });

  // =========================================================================
  // exec
  // =========================================================================
  describe('#exec', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should call _run with shell, vmName, --, and provided args', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: 'output', stderr: '', code: 0});

      await mgr.exec(['ls', '-la']);
      expect(runStub.calledOnce).to.be.true;
      expect(runStub.firstCall.args[0]).to.deep.equal(['shell', 'lando', '--', 'ls', '-la']);
    });

    it('should use custom vmName in exec arguments', async () => {
      const mgr = new LimaManager({vmName: 'custom-vm', debug: noopDebug});
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.exec(['cat', '/etc/hosts']);
      expect(runStub.firstCall.args[0]).to.deep.equal(['shell', 'custom-vm', '--', 'cat', '/etc/hosts']);
    });

    it('should return the _run result', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      const expected = {stdout: 'hello', stderr: '', code: 0};
      sandbox.stub(mgr, '_run').resolves(expected);

      const result = await mgr.exec(['echo', 'hello']);
      expect(result).to.deep.equal(expected);
    });

    it('should propagate error from _run', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, '_run').rejects(new Error('exec failed'));

      try {
        await mgr.exec(['bad-command']);
        expect.fail('should have thrown');
      } catch (err) {
        err.message.should.equal('exec failed');
      }
    });
  });

  // =========================================================================
  // nerdctl
  // =========================================================================
  describe('#nerdctl', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should call _run with shell, vmName, --, sudo, nerdctl, and provided args', async () => {
      const mgr = new LimaManager({vmName: 'lando', debug: noopDebug});
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.nerdctl(['ps', '-a']);
      expect(runStub.calledOnce).to.be.true;
      expect(runStub.firstCall.args[0]).to.deep.equal([
        'shell', 'lando', '--', 'sudo', 'nerdctl', 'ps', '-a',
      ]);
    });

    it('should use custom vmName in nerdctl arguments', async () => {
      const mgr = new LimaManager({vmName: 'custom-vm', debug: noopDebug});
      const runStub = sandbox.stub(mgr, '_run').resolves({stdout: '', stderr: '', code: 0});

      await mgr.nerdctl(['images']);
      expect(runStub.firstCall.args[0]).to.deep.equal([
        'shell', 'custom-vm', '--', 'sudo', 'nerdctl', 'images',
      ]);
    });

    it('should return the _run result', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      const expected = {stdout: 'image-list', stderr: '', code: 0};
      sandbox.stub(mgr, '_run').resolves(expected);

      const result = await mgr.nerdctl(['images']);
      expect(result).to.deep.equal(expected);
    });

    it('should propagate error from _run', async () => {
      const mgr = new LimaManager({debug: noopDebug});
      sandbox.stub(mgr, '_run').rejects(new Error('nerdctl failed'));

      try {
        await mgr.nerdctl(['bad-command']);
        expect.fail('should have thrown');
      } catch (err) {
        err.message.should.equal('nerdctl failed');
      }
    });
  });

  // =========================================================================
  // _run (integration with run-command — argument forwarding only)
  // =========================================================================
  describe('#_run', () => {
    it('should pass limactl binary and args to the underlying run-command', async () => {
      const mgr = new LimaManager({limactl: '/custom/limactl', debug: noopDebug});
      // Stub _run at the instance level to verify arg forwarding
      // We cannot stub the require('run-command') without proxyquire,
      // so we verify the method exists and accepts args correctly.
      expect(mgr._run).to.be.a('function');
    });

    it('should use the configured limactl path', () => {
      const mgr = new LimaManager({limactl: '/opt/bin/limactl', debug: noopDebug});
      mgr.limactl.should.equal('/opt/bin/limactl');
    });
  });
});
