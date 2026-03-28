/*
 * Tests for WslHelper.
 * @file wsl-helper.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const sinon = require('sinon');
const mockFs = require('mock-fs');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WslHelper = require('./../lib/backends/containerd/wsl-helper');

// Provide a noop debug function so tests don't need a real Lando Log instance
const noopDebug = () => {};

describe('wsl-helper', () => {
  // =========================================================================
  // Constructor
  // =========================================================================
  describe('#constructor defaults', () => {
    it('should set debug to a noop function when not provided', () => {
      const helper = new WslHelper();
      expect(helper.debug).to.be.a('function');
      // Should not throw
      helper.debug('test');
    });

    it('should set userConfRoot to ~/.lando by default', () => {
      const helper = new WslHelper();
      const expected = path.join(os.homedir(), '.lando');
      helper.userConfRoot.should.equal(expected);
    });
  });

  describe('#constructor custom options', () => {
    it('should accept custom debug function', () => {
      const customDebug = sinon.stub();
      const helper = new WslHelper({debug: customDebug});
      helper.debug.should.equal(customDebug);
    });

    it('should accept custom userConfRoot', () => {
      const helper = new WslHelper({userConfRoot: '/custom/root'});
      helper.userConfRoot.should.equal('/custom/root');
    });
  });

  // =========================================================================
  // isWsl (static method)
  // =========================================================================
  describe('.isWsl', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;
    /** @type {string} */
    let originalPlatform;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      originalPlatform = process.platform;
    });

    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
      // Restore platform — Object.defineProperty is needed because process.platform
      // is a read-only property
      Object.defineProperty(process, 'platform', {value: originalPlatform});
    });

    it('should return false on non-linux platforms', () => {
      Object.defineProperty(process, 'platform', {value: 'darwin'});
      expect(WslHelper.isWsl()).to.be.false;
    });

    it('should return false on Windows platform', () => {
      Object.defineProperty(process, 'platform', {value: 'win32'});
      expect(WslHelper.isWsl()).to.be.false;
    });

    it('should return true when /proc/version contains "microsoft" (lowercase)', () => {
      Object.defineProperty(process, 'platform', {value: 'linux'});
      mockFs({
        '/proc/version': 'Linux version 5.15.90.1-microsoft-standard-WSL2',
      });
      expect(WslHelper.isWsl()).to.be.true;
    });

    it('should return true when /proc/version contains "Microsoft" (mixed case)', () => {
      Object.defineProperty(process, 'platform', {value: 'linux'});
      mockFs({
        '/proc/version': 'Linux version 4.4.0-19041-Microsoft',
      });
      expect(WslHelper.isWsl()).to.be.true;
    });

    it('should return false when /proc/version does not contain "microsoft"', () => {
      Object.defineProperty(process, 'platform', {value: 'linux'});
      mockFs({
        '/proc/version': 'Linux version 6.1.0-18-amd64 (debian-kernel@lists.debian.org)',
      });
      expect(WslHelper.isWsl()).to.be.false;
    });

    it('should return false when /proc/version cannot be read', () => {
      Object.defineProperty(process, 'platform', {value: 'linux'});
      // mock-fs with empty filesystem — /proc/version does not exist
      mockFs({});
      expect(WslHelper.isWsl()).to.be.false;
    });
  });

  // =========================================================================
  // isDockerDesktopRunning
  // =========================================================================
  describe('#isDockerDesktopRunning', () => {
    afterEach(() => {
      mockFs.restore();
    });

    it('should return true when Docker Desktop WSL proxy socket exists', async () => {
      mockFs({
        '/mnt/wsl/docker-desktop/docker-desktop-proxy': '',
      });

      const helper = new WslHelper({debug: noopDebug});
      const result = await helper.isDockerDesktopRunning();
      expect(result).to.be.true;
    });

    it('should return true when /var/run/docker.sock exists', async () => {
      mockFs({
        '/var/run/docker.sock': '',
      });

      const helper = new WslHelper({debug: noopDebug});
      const result = await helper.isDockerDesktopRunning();
      expect(result).to.be.true;
    });

    it('should return true when both sockets exist', async () => {
      mockFs({
        '/mnt/wsl/docker-desktop/docker-desktop-proxy': '',
        '/var/run/docker.sock': '',
      });

      const helper = new WslHelper({debug: noopDebug});
      const result = await helper.isDockerDesktopRunning();
      expect(result).to.be.true;
    });

    it('should return false when neither socket exists', async () => {
      mockFs({});

      const helper = new WslHelper({debug: noopDebug});
      const result = await helper.isDockerDesktopRunning();
      expect(result).to.be.false;
    });
  });

  // =========================================================================
  // ensureSocketPermissions
  // =========================================================================
  describe('#ensureSocketPermissions', () => {
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it('should create parent directory recursively', async () => {
      mockFs({});
      // Stub process.getuid/getgid and fs.chownSync since mock-fs doesn't support chown
      sandbox.stub(process, 'getuid').returns(1000);
      sandbox.stub(process, 'getgid').returns(1000);
      sandbox.stub(fs, 'chownSync');

      const helper = new WslHelper({debug: noopDebug});
      await helper.ensureSocketPermissions('/run/lando/finch.sock');

      // Verify the directory was created
      expect(fs.existsSync('/run/lando')).to.be.true;
    });

    it('should call chownSync with current uid and gid', async () => {
      mockFs({'/run/lando': {}});
      sandbox.stub(process, 'getuid').returns(1000);
      sandbox.stub(process, 'getgid').returns(1001);
      const chownStub = sandbox.stub(fs, 'chownSync');

      const helper = new WslHelper({debug: noopDebug});
      await helper.ensureSocketPermissions('/run/lando/finch.sock');

      expect(chownStub.calledOnce).to.be.true;
      expect(chownStub.firstCall.args[0]).to.equal('/run/lando');
      expect(chownStub.firstCall.args[1]).to.equal(1000);
      expect(chownStub.firstCall.args[2]).to.equal(1001);
    });

    it('should call debug on success', async () => {
      mockFs({'/run': {}});
      sandbox.stub(process, 'getuid').returns(1000);
      sandbox.stub(process, 'getgid').returns(1000);
      sandbox.stub(fs, 'chownSync');

      const debugStub = sinon.stub();
      const helper = new WslHelper({debug: debugStub});
      await helper.ensureSocketPermissions('/run/lando/finch.sock');

      expect(debugStub.calledWith(
        'ensured socket directory permissions for %s',
        '/run/lando',
      )).to.be.true;
    });

    it('should handle errors gracefully without throwing', async () => {
      mockFs({});
      sandbox.stub(process, 'getuid').returns(1000);
      sandbox.stub(process, 'getgid').returns(1000);
      // mkdirSync will work but chownSync will fail
      sandbox.stub(fs, 'chownSync').throws(new Error('EPERM: operation not permitted'));

      const debugStub = sinon.stub();
      const helper = new WslHelper({debug: debugStub});

      // Should not throw
      await helper.ensureSocketPermissions('/run/lando/finch.sock');

      expect(debugStub.calledWith(
        'could not set socket directory permissions: %s',
        'EPERM: operation not permitted',
      )).to.be.true;
    });

    it('should handle mkdirSync failure gracefully', async () => {
      // Use a path that can't be created
      sandbox.stub(fs, 'mkdirSync').throws(new Error('EACCES: permission denied'));

      const debugStub = sinon.stub();
      const helper = new WslHelper({debug: debugStub});

      // Should not throw
      await helper.ensureSocketPermissions('/root/protected/path/finch.sock');

      expect(debugStub.calledWith(
        'could not set socket directory permissions: %s',
        'EACCES: permission denied',
      )).to.be.true;
    });
  });
});
