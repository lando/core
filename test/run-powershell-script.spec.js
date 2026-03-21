'use strict';

const chai = require('chai');
const expect = chai.expect;

const runPowerShellScript = require('./../utils/run-powershell-script');

describe('run-powershell-script', () => {
  describe('WSL interop errors', () => {
    it('should detect UtilAcceptVsock failures', () => {
      expect(runPowerShellScript._isWSLInteropError('<3>WSL (1 - ) ERROR: UtilAcceptVsock:271: accept4 failed 110\n')).to.equal(true);
      expect(runPowerShellScript._isWSLInteropError('some other error')).to.equal(false);
    });

    it('should format a friendly restart recommendation', () => {
      const message = runPowerShellScript._formatWSLInteropError('<3>WSL (1 - ) ERROR: UtilAcceptVsock:271: accept4 failed 110\n');

      expect(message).to.equal('Windows interop is unavailable from WSL; restart WSL with `wsl --shutdown` and try again.');
    });
  });
});
