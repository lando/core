/*
 * Tests for get-buildkit-config.
 * @file get-buildkit-config.spec.js
 */

'use strict';

const os = require('os');
const chai = require('chai');
const expect = chai.expect;
chai.should();

const getBuildkitConfig = require('./../utils/get-buildkit-config');

describe('get-buildkit-config', () => {
  describe('#defaults', () => {
    it('should return a string with correct TOML structure', () => {
      const config = getBuildkitConfig();
      config.should.be.a('string');
      config.should.include('[worker.oci]');
      config.should.include('[worker.containerd]');
    });

    it('should have worker.containerd enabled and worker.oci disabled', () => {
      const config = getBuildkitConfig();
      // OCI worker disabled
      config.should.include('[worker.oci]');
      config.should.include('enabled = false');
      // Containerd worker enabled
      config.should.include('[worker.containerd]');
      config.should.include('enabled = true');
    });

    it('should include auto-generated header comments', () => {
      const config = getBuildkitConfig();
      config.should.include('# Lando BuildKit configuration');
      config.should.include('# Auto-generated');
    });

    it('should use default containerdSocket', () => {
      const config = getBuildkitConfig();
      config.should.include('address = "/run/lando/containerd.sock"');
    });

    it('should include GC policy section', () => {
      const config = getBuildkitConfig();
      config.should.include('[[worker.containerd.gcpolicy]]');
      config.should.include('keepDuration = 604800');
      config.should.include('all = true');
    });

    it('should include platform support', () => {
      const config = getBuildkitConfig();
      config.should.include('platforms = ["linux/amd64", "linux/arm64"]');
    });
  });

  describe('#custom containerdSocket', () => {
    it('should reflect custom containerdSocket in output', () => {
      const config = getBuildkitConfig({containerdSocket: '/tmp/test.sock'});
      config.should.include('address = "/tmp/test.sock"');
    });

    it('should not include default socket when custom is provided', () => {
      const config = getBuildkitConfig({containerdSocket: '/custom/containerd.sock'});
      config.should.include('address = "/custom/containerd.sock"');
      config.should.not.include('/run/lando/containerd.sock');
    });
  });

  describe('#GC policy', () => {
    it('should use default gcMaxBytes (10GB)', () => {
      const config = getBuildkitConfig();
      const defaultBytes = 10 * 1024 * 1024 * 1024; // 10GB
      config.should.include(`reservedSpace = ${defaultBytes}`);
    });

    it('should use provided gcMaxBytes', () => {
      const customBytes = 5 * 1024 * 1024 * 1024; // 5GB
      const config = getBuildkitConfig({gcMaxBytes: customBytes});
      config.should.include(`reservedSpace = ${customBytes}`);
    });

    it('should use small gcMaxBytes value', () => {
      const config = getBuildkitConfig({gcMaxBytes: 1024});
      config.should.include('reservedSpace = 1024');
    });
  });

  describe('#parallelism', () => {
    it('should default to CPU count', () => {
      const config = getBuildkitConfig();
      const expectedParallelism = Math.max(1, os.cpus().length);
      config.should.include(`max-parallelism = ${expectedParallelism}`);
    });

    it('should use custom parallelism when provided', () => {
      const config = getBuildkitConfig({parallelism: 8});
      config.should.include('max-parallelism = 8');
    });

    it('should accept parallelism of 1', () => {
      const config = getBuildkitConfig({parallelism: 1});
      config.should.include('max-parallelism = 1');
    });
  });

  describe('#debug', () => {
    it('should not include debug flag by default', () => {
      const config = getBuildkitConfig();
      config.should.not.include('debug = true');
    });

    it('should add debug flag when debug is true', () => {
      const config = getBuildkitConfig({debug: true});
      config.should.include('debug = true');
    });

    it('should not add debug flag when debug is false', () => {
      const config = getBuildkitConfig({debug: false});
      config.should.not.include('debug = true');
    });
  });

  describe('#registry mirrors', () => {
    it('should not include registry sections by default', () => {
      const config = getBuildkitConfig();
      config.should.not.include('[registry.');
    });

    it('should not include registry sections when empty object is passed', () => {
      const config = getBuildkitConfig({registryMirrors: {}});
      config.should.not.include('[registry.');
    });

    it('should include registry mirrors when configured', () => {
      const config = getBuildkitConfig({
        registryMirrors: {'docker.io': 'https://mirror.example.com'},
      });
      config.should.include('[registry."docker.io"]');
      config.should.include('mirrors = ["https://mirror.example.com"]');
    });

    it('should include multiple registry mirrors', () => {
      const config = getBuildkitConfig({
        registryMirrors: {
          'docker.io': 'https://mirror1.example.com',
          'ghcr.io': 'https://mirror2.example.com',
        },
      });
      config.should.include('[registry."docker.io"]');
      config.should.include('mirrors = ["https://mirror1.example.com"]');
      config.should.include('[registry."ghcr.io"]');
      config.should.include('mirrors = ["https://mirror2.example.com"]');
    });
  });
});
