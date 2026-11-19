'use strict';

const {expect} = require('chai');
const childProcess = require('child_process');
const sinon = require('sinon');

describe('spawn-sync-stringer', () => {
  let spawnSync;
  let stringer;

  beforeEach(() => {
    spawnSync = sinon.stub(childProcess, 'spawnSync');
    delete require.cache[require.resolve('../utils/spawn-sync-stringer')];
    stringer = require('../utils/spawn-sync-stringer');
  });

  afterEach(() => {
    spawnSync.restore();
    delete require.cache[require.resolve('../utils/spawn-sync-stringer')];
  });

  it('preserves the original spawn error instead of dereferencing null output', () => {
    const error = Object.assign(new Error('spawn powershell.exe ENOENT'), {
      code: 'ENOENT', path: 'powershell.exe', syscall: 'spawn powershell.exe',
    });
    spawnSync.returns({error, status: null, stdout: null, stderr: null});

    expect(() => stringer('powershell.exe')).to.throw(error);
  });

  it('preserves spawn errors even when partial output is available', () => {
    const error = Object.assign(new Error('spawnSync command ETIMEDOUT'), {code: 'ETIMEDOUT'});
    spawnSync.returns({error, status: null, stdout: Buffer.from('partial output'), stderr: Buffer.alloc(0)});

    expect(() => stringer('command')).to.throw(error);
  });

  it('trims buffers and forwards command arguments and options', () => {
    const args = ['--version'];
    const options = {cwd: '/tmp'};
    spawnSync.returns({status: 0, pid: 123, stdout: Buffer.from(' version \n'), stderr: Buffer.from(' warning \n')});

    const result = stringer('command', args, options);

    expect(spawnSync.calledOnceWithExactly('command', args, options)).to.equal(true);
    expect(result).to.include({status: 0, pid: 123, stdout: 'version', stderr: 'warning'});
  });

  it('returns nonzero exits with trimmed string output for the caller to handle', () => {
    spawnSync.returns({status: 1, stdout: ' output \n', stderr: ' failure \n'});

    expect(stringer('command', [], {encoding: 'utf8'})).to.include({status: 1, stdout: 'output', stderr: 'failure'});
  });

  it('normalizes uncaptured streams without treating signal termination as success', () => {
    spawnSync.returns({status: null, signal: 'SIGTERM', stdout: null, stderr: undefined});

    expect(stringer('command')).to.include({status: null, signal: 'SIGTERM', stdout: '', stderr: ''});
  });
});

describe('spawn-sync-stringer with real child processes', () => {
  it('reports ENOENT and the executable path for an unavailable command', () => {
    const stringer = require('../utils/spawn-sync-stringer');
    const command = `${process.execPath}-lando-missing-executable`;

    expect(() => stringer(command)).to.throw().that.includes({code: 'ENOENT', path: command});
  });

  it('accepts ignored output streams from a real child process', () => {
    const stringer = require('../utils/spawn-sync-stringer');

    expect(stringer(process.execPath, ['-e', ''], {stdio: 'ignore'})).to.include({status: 0, stdout: '', stderr: ''});
  });
});
