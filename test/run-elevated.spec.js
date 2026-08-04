'use strict';

const child = require('child_process');
const chai = require('chai');
const sinon = require('sinon');
chai.should();

describe('run-elevated', () => {
  let runElevated;
  let spawn;

  const getSudoArgv = options => {
    runElevated(['whoami'], {method: 'sudo', ...options});
    return spawn.firstCall.args[1];
  };

  before(() => {
    spawn = sinon.stub(child, 'spawn').returns({});
    delete require.cache[require.resolve('../utils/run-elevated')];
    runElevated = require('../utils/run-elevated');
  });

  beforeEach(() => spawn.resetHistory());

  after(() => {
    spawn.restore();
    delete require.cache[require.resolve('../utils/run-elevated')];
  });

  it('should use stdin without bell for an interactive password', () => {
    getSudoArgv({isInteractive: true, password: 'secret'}).should.deep.equal([
      '--stdin',
      '--',
      'whoami',
    ]);
  });

  it('should use bell without stdin when interactive without a password', () => {
    getSudoArgv({isInteractive: true}).should.deep.equal([
      '--bell',
      '--',
      'whoami',
    ]);
  });

  it('should use non-interactive mode when not interactive', () => {
    getSudoArgv({isInteractive: false}).should.deep.equal([
      '--non-interactive',
      '--bell',
      '--',
      'whoami',
    ]);
  });

  it('should omit bell when notifications are disabled', () => {
    getSudoArgv({isInteractive: true, notify: false}).should.deep.equal([
      '--',
      'whoami',
    ]);
  });
});
