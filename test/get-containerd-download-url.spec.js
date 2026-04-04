/*
 * Tests for get-containerd-download-url.
 * @file get-containerd-download-url.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const getUrl = require('./../utils/get-containerd-download-url');

describe('get-containerd-download-url', () => {
  describe('#containerd', () => {
    it('should return a valid GitHub URL for containerd on linux/amd64', () => {
      const url = getUrl('containerd', {platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/containerd/containerd/releases/download/v2.0.4/containerd-2.0.4-linux-amd64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for containerd on linux/arm64', () => {
      const url = getUrl('containerd', {platform: 'linux', arch: 'arm64'});
      url.should.equal(
        'https://github.com/containerd/containerd/releases/download/v2.0.4/containerd-2.0.4-linux-arm64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for containerd on darwin/amd64', () => {
      const url = getUrl('containerd', {platform: 'darwin', arch: 'amd64'});
      url.should.equal(
        'https://github.com/containerd/containerd/releases/download/v2.0.4/containerd-2.0.4-darwin-amd64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for containerd on darwin/arm64', () => {
      const url = getUrl('containerd', {platform: 'darwin', arch: 'arm64'});
      url.should.equal(
        'https://github.com/containerd/containerd/releases/download/v2.0.4/containerd-2.0.4-darwin-arm64.tar.gz',
      );
    });

    it('should accept a custom version', () => {
      const url = getUrl('containerd', {version: '1.7.0', platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/containerd/containerd/releases/download/v1.7.0/containerd-1.7.0-linux-amd64.tar.gz',
      );
    });
  });

  describe('#nerdctl', () => {
    it('should return a valid GitHub URL for nerdctl on linux/amd64', () => {
      const url = getUrl('nerdctl', {platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/containerd/nerdctl/releases/download/v2.0.5/nerdctl-2.0.5-linux-amd64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for nerdctl on linux/arm64', () => {
      const url = getUrl('nerdctl', {platform: 'linux', arch: 'arm64'});
      url.should.equal(
        'https://github.com/containerd/nerdctl/releases/download/v2.0.5/nerdctl-2.0.5-linux-arm64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for nerdctl on darwin/arm64', () => {
      const url = getUrl('nerdctl', {platform: 'darwin', arch: 'arm64'});
      url.should.equal(
        'https://github.com/containerd/nerdctl/releases/download/v2.0.5/nerdctl-2.0.5-darwin-arm64.tar.gz',
      );
    });

    it('should accept a custom version', () => {
      const url = getUrl('nerdctl', {version: '1.5.0', platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/containerd/nerdctl/releases/download/v1.5.0/nerdctl-1.5.0-linux-amd64.tar.gz',
      );
    });
  });

  describe('#buildkit', () => {
    it('should return a valid GitHub URL for buildkit on linux/amd64', () => {
      const url = getUrl('buildkit', {platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/moby/buildkit/releases/download/v0.18.2/buildkit-v0.18.2.linux-amd64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for buildkit on linux/arm64', () => {
      const url = getUrl('buildkit', {platform: 'linux', arch: 'arm64'});
      url.should.equal(
        'https://github.com/moby/buildkit/releases/download/v0.18.2/buildkit-v0.18.2.linux-arm64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for buildkit on darwin/amd64', () => {
      const url = getUrl('buildkit', {platform: 'darwin', arch: 'amd64'});
      url.should.equal(
        'https://github.com/moby/buildkit/releases/download/v0.18.2/buildkit-v0.18.2.darwin-amd64.tar.gz',
      );
    });

    it('should return a valid GitHub URL for buildkit on darwin/arm64', () => {
      const url = getUrl('buildkit', {platform: 'darwin', arch: 'arm64'});
      url.should.equal(
        'https://github.com/moby/buildkit/releases/download/v0.18.2/buildkit-v0.18.2.darwin-arm64.tar.gz',
      );
    });

    it('should accept a custom version', () => {
      const url = getUrl('buildkit', {version: '0.12.0', platform: 'linux', arch: 'amd64'});
      url.should.equal(
        'https://github.com/moby/buildkit/releases/download/v0.12.0/buildkit-v0.12.0.linux-amd64.tar.gz',
      );
    });

    it('should use a dot separator between version and platform (not dash)', () => {
      const url = getUrl('buildkit', {platform: 'linux', arch: 'amd64'});
      // buildkit uses: buildkit-v{V}.{OS}-{ARCH} (dot between version and OS)
      url.should.match(/buildkit-v[\d.]+\.linux-amd64/);
    });
  });

  describe('#error handling', () => {
    it('should throw for an unknown binary name', () => {
      expect(() => getUrl('podman', {platform: 'linux', arch: 'amd64'}))
        .to.throw(/Unknown binary/);
    });

    it('should throw for unsupported platform/arch', () => {
      expect(() => getUrl('containerd', {platform: 'windows', arch: 'amd64'}))
        .to.throw(/Unsupported platform/);
    });

    it('should throw for unsupported arch', () => {
      expect(() => getUrl('containerd', {platform: 'linux', arch: 'mips'}))
        .to.throw(/Unsupported platform/);
    });

    it('should normalize win32 to windows before validation', () => {
      // win32 gets mapped to windows, which is unsupported
      expect(() => getUrl('containerd', {platform: 'win32', arch: 'amd64'}))
        .to.throw(/Unsupported platform/);
    });
  });

  describe('#platform auto-detection', () => {
    it('should work without explicit platform/arch (uses process defaults)', () => {
      // This should not throw on supported platforms
      const currentPlatform = process.platform;
      const currentArch = process.arch === 'x64' ? 'amd64' : process.arch;
      const key = `${currentPlatform}-${currentArch}`;
      const supported = ['linux-amd64', 'linux-arm64', 'darwin-amd64', 'darwin-arm64'];

      if (supported.includes(key)) {
        const url = getUrl('containerd');
        expect(url).to.be.a('string');
        url.should.include('github.com');
        url.should.include('containerd');
      }
    });
  });
});
