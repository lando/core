/*
 * Tests for wsl.
 * @file wsl.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const os = require('os');
const fs = require('fs');
const childProcess = require('child_process');

chai.use(require('chai-as-promised'));
chai.should();

const WslManager = require('../lib/wsl');

describe('WslManager', () => {
  let osReleaseStub;
  let execSyncStub;
  let fsReadFileSyncStub;

  beforeEach(() => {
    osReleaseStub = sinon.stub(os, 'release');
    execSyncStub = sinon.stub(childProcess, 'execSync');
    fsReadFileSyncStub = sinon.stub(fs, 'readFileSync');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#isRunningInWSL', () => {
    it('should return true when running in WSL', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      WslManager.isRunningInWSL().should.be.true;
    });

    it('should return false when running in Windows', () => {
      osReleaseStub.returns('10.0.19041');
      WslManager.isRunningInWSL().should.be.false;
    });

    it('should return false when running in Linux', () => {
      osReleaseStub.returns('5.4.0-42-generic');
      WslManager.isRunningInWSL().should.be.false;
    });
  });

  describe('#isWindowsInteropEnabled', () => {
    it('should return true when Windows interop is enabled', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath c:\\').returns('/mnt/c');
      WslManager.isWindowsInteropEnabled().should.be.true;
    });

    it('should return false when Windows interop is disabled', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath c:\\').throws(new Error('Command failed'));
      WslManager.isWindowsInteropEnabled().should.be.false;
    });

    it('should return false when not running in WSL', () => {
      osReleaseStub.returns('5.4.0-42-generic');
      WslManager.isWindowsInteropEnabled().should.be.false;
    });
  });

  describe('#isDockerDesktopIntegrationEnabled', () => {
    it('should return true when Docker Desktop integration is enabled', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath c:\\').returns('/mnt/c');
      execSyncStub.withArgs('which docker.exe').returns('/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe');
      fsReadFileSyncStub.returns(JSON.stringify({
        enableIntegrationWithDefaultWslDistro: true,
      }));
      WslManager.isDockerDesktopIntegrationEnabled().should.be.true;
    });

    it('should return false when Docker Desktop integration is disabled', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath c:\\').returns('/mnt/c');
      execSyncStub.withArgs('which docker.exe').throws(new Error('Command failed'));
      WslManager.isDockerDesktopIntegrationEnabled().should.be.false;
    });

    it('should return false when not running in WSL', () => {
      osReleaseStub.returns('5.4.0-42-generic');
      WslManager.isDockerDesktopIntegrationEnabled().should.be.false;
    });
  });

  describe('#getWindowsPath', () => {
    it('should return the correct Windows path when running in WSL', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath c:\\').returns('/mnt/c');
      // eslint-disable-next-line max-len
      execSyncStub.withArgs('powershell.exe -Command "[System.Environment]::GetFolderPath(\'UserProfile\'); [System.Environment]::GetFolderPath(\'ApplicationData\'); [System.Environment]::GetFolderPath(\'LocalApplicationData\'); [System.Environment]::GetFolderPath(\'ProgramFiles\')"')
        // eslint-disable-next-line max-len
        .returns('C:\\Users\\testuser\nC:\\Users\\testuser\\AppData\\Roaming\nC:\\Users\\testuser\\AppData\\Local\nC:\\Program Files');
      // eslint-disable-next-line max-len
      execSyncStub.withArgs('wslpath -a "C:\\Users\\testuser\\AppData\\Roaming"').returns('/mnt/c/Users/testuser/AppData/Roaming');

      expect(WslManager.getWindowsPath('ApplicationData')).to.equal('/mnt/c/Users/testuser/AppData/Roaming');
    });

    it('should throw an error when Windows interop is not enabled', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath c:\\').throws(new Error('Command failed'));

      expect(() => WslManager.getWindowsPath('ApplicationData')).to.throw('Windows interoperability is not enabled');
    });

    it('should throw an error for invalid path names', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath c:\\').returns('/mnt/c');

      expect(() => WslManager.getWindowsPath('InvalidPath')).to.throw('Invalid path name');
    });
  });

  describe('#getWslPath', () => {
    it('should convert Windows path to WSL path', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wslpath -a "C:\\Users\\testuser"').returns('/mnt/c/Users/testuser');

      expect(WslManager.getWslPath('C:\\Users\\testuser')).to.equal('/mnt/c/Users/testuser');
    });

    it('should throw an error when not running in WSL', () => {
      osReleaseStub.returns('5.4.0-42-generic');

      expect(() => WslManager.getWslPath('C:\\Users\\testuser')).to.throw('Must be running in WSL');
    });
  });

  describe('#isDefaultWslDistro', () => {
    it('should return true when current distro is default', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wsl.exe -l').returns('Ubuntu-20.04 (Default)\nDebian');
      process.env.WSL_DISTRO_NAME = 'Ubuntu-20.04';

      WslManager.isDefaultWslDistro().should.be.true;
    });

    it('should return false when current distro is not default', () => {
      osReleaseStub.returns('5.10.16.3-microsoft-standard-WSL2');
      execSyncStub.withArgs('wsl.exe -l').returns('Ubuntu-20.04 (Default)\nDebian');
      process.env.WSL_DISTRO_NAME = 'Debian';

      WslManager.isDefaultWslDistro().should.be.false;
    });

    it('should return false when not running in WSL', () => {
      osReleaseStub.returns('5.4.0-42-generic');

      WslManager.isDefaultWslDistro().should.be.false;
    });
  });
});
