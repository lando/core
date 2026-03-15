/*
 * Tests for get-finch-daemon-download-url.
 * @file get-finch-daemon-download-url.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const getUrl = require('./../utils/get-finch-daemon-download-url');

describe('get-finch-daemon-download-url', () => {
  describe('#linux', () => {
    it('should return a valid GitHub URL for linux/amd64', () => {
      const url = getUrl({platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/runfinch/finch-daemon/releases/download/v0.22.0/finch-daemon-0.22.0-linux-amd64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for linux/arm64', () => {
      const url = getUrl({platform: 'linux', arch: 'arm64'});
      url.should.equal(
        'https://github.com/runfinch/finch-daemon/releases/download/v0.22.0/finch-daemon-0.22.0-linux-arm64.tar.gz',
      );
    });
  });

  describe('#darwin', () => {
    it('should return a valid GitHub URL for darwin/amd64', () => {
      const url = getUrl({platform: 'darwin', arch: 'amd64'});
      url.should.equal(
        'https://github.com/runfinch/finch-daemon/releases/download/v0.22.0/finch-daemon-0.22.0-darwin-amd64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for darwin/arm64', () => {
      const url = getUrl({platform: 'darwin', arch: 'arm64'});
      url.should.equal(
        'https://github.com/runfinch/finch-daemon/releases/download/v0.22.0/finch-daemon-0.22.0-darwin-arm64.tar.gz',
      );
    });
  });

  describe('#custom version', () => {
    it('should accept a custom version', () => {
      const url = getUrl({version: '0.21.0', platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/runfinch/finch-daemon/releases/download/v0.21.0/finch-daemon-0.21.0-linux-amd64.tar.gz',
      );
    });

    it('should use default version when none specified', () => {
      const url = getUrl({platform: 'linux', arch: 'amd64'});
      url.should.include('0.22.0');
    });
  });

  describe('#error handling', () => {
    it('should throw for unsupported platform/arch', () => {
      expect(() => getUrl({platform: 'windows', arch: 'amd64'}))
        .to.throw(/Unsupported platform/);
    });

    it('should throw for unsupported arch', () => {
      expect(() => getUrl({platform: 'linux', arch: 'mips'}))
        .to.throw(/Unsupported platform/);
    });

    it('should normalize win32 to windows before validation', () => {
      // win32 gets mapped to windows, which is unsupported
      expect(() => getUrl({platform: 'win32', arch: 'amd64'}))
        .to.throw(/Unsupported platform/);
    });
  });

  describe('#url format', () => {
    it('should point to the runfinch/finch-daemon GitHub repo', () => {
      const url = getUrl({platform: 'linux', arch: 'amd64'});
      url.should.include('github.com/runfinch/finch-daemon');
    });

    it('should use .tar.gz extension', () => {
      const url = getUrl({platform: 'linux', arch: 'amd64'});
      url.should.match(/\.tar\.gz$/);
    });

    it('should include the version with v prefix in the tag path', () => {
      const url = getUrl({version: '0.22.0', platform: 'linux', arch: 'amd64'});
      url.should.include('/download/v0.22.0/');
    });

    it('should include version without v prefix in the filename', () => {
      const url = getUrl({version: '0.22.0', platform: 'linux', arch: 'amd64'});
      url.should.include('finch-daemon-0.22.0-');
    });
  });

  describe('#platform auto-detection', () => {
    it('should work without explicit platform/arch (uses process defaults)', () => {
      const currentPlatform = process.platform;
      const currentArch = process.arch === 'x64' ? 'amd64' : process.arch;
      const key = `${currentPlatform}-${currentArch}`;
      const supported = ['linux-amd64', 'linux-arm64', 'darwin-amd64', 'darwin-arm64'];

      if (supported.includes(key)) {
        const url = getUrl();
        expect(url).to.be.a('string');
        url.should.include('github.com');
        url.should.include('finch-daemon');
      }
    });
  });
});
