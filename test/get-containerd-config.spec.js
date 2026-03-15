/*
 * Tests for get-containerd-config.
 * @file get-containerd-config.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const getContainerdConfig = require('./../utils/get-containerd-config');

describe('get-containerd-config', () => {
  describe('#defaults', () => {
    it('should return a string with correct TOML structure', () => {
      const config = getContainerdConfig();
      config.should.be.a('string');
      config.should.include('version = 3');
      config.should.include('[grpc]');
      config.should.include('state = ');
      config.should.include('root = ');
      config.should.include('[plugins]');
    });

    it('should use default socketPath, stateDir, and rootDir', () => {
      const config = getContainerdConfig();
      config.should.include('address = "/run/lando/containerd.sock"');
      config.should.include('state = "/var/lib/lando/containerd"');
      config.should.include('root = "/var/lib/lando/containerd/root"');
    });

    it('should include auto-generated header comments', () => {
      const config = getContainerdConfig();
      config.should.include('# Lando containerd configuration');
      config.should.include('# Auto-generated');
    });

    it('should use overlayfs snapshotter by default', () => {
      const config = getContainerdConfig();
      config.should.include('io.containerd.snapshotter.v1.overlayfs');
    });
  });

  describe('#custom paths', () => {
    it('should reflect custom socketPath in output', () => {
      const config = getContainerdConfig({socketPath: '/tmp/test.sock'});
      config.should.include('address = "/tmp/test.sock"');
    });

    it('should reflect custom stateDir in output', () => {
      const config = getContainerdConfig({stateDir: '/custom/state'});
      config.should.include('state = "/custom/state"');
    });

    it('should reflect custom rootDir in output', () => {
      const config = getContainerdConfig({rootDir: '/custom/root'});
      config.should.include('root = "/custom/root"');
      config.should.include('root_path = "/custom/root/snapshots"');
    });

    it('should reflect all custom paths together', () => {
      const config = getContainerdConfig({
        socketPath: '/my/sock',
        stateDir: '/my/state',
        rootDir: '/my/root',
      });
      config.should.include('address = "/my/sock"');
      config.should.include('state = "/my/state"');
      config.should.include('root = "/my/root"');
    });
  });

  describe('#debug', () => {
    it('should not include [debug] section by default', () => {
      const config = getContainerdConfig();
      config.should.not.include('[debug]');
      config.should.not.include('level = "debug"');
    });

    it('should add [debug] section when debug is true', () => {
      const config = getContainerdConfig({debug: true});
      config.should.include('[debug]');
      config.should.include('level = "debug"');
    });

    it('should not add [debug] section when debug is false', () => {
      const config = getContainerdConfig({debug: false});
      config.should.not.include('[debug]');
    });
  });

  describe('#CRI plugin', () => {
    it('should disable CRI plugin by default', () => {
      const config = getContainerdConfig();
      config.should.include('disabled_plugins = ["io.containerd.grpc.v1.cri"]');
    });

    it('should enable CRI plugin when disableCri is false', () => {
      const config = getContainerdConfig({disableCri: false});
      config.should.not.include('disabled_plugins');
    });

    it('should disable CRI plugin when disableCri is true', () => {
      const config = getContainerdConfig({disableCri: true});
      config.should.include('disabled_plugins = ["io.containerd.grpc.v1.cri"]');
    });
  });

  describe('#snapshotter', () => {
    it('should use overlayfs snapshotter by default', () => {
      const config = getContainerdConfig();
      config.should.include('io.containerd.snapshotter.v1.overlayfs');
    });

    it('should use custom snapshotter when specified', () => {
      const config = getContainerdConfig({snapshotter: 'native'});
      config.should.include('io.containerd.snapshotter.v1.native');
      config.should.not.include('io.containerd.snapshotter.v1.overlayfs');
    });

    it('should set snapshots root_path under rootDir', () => {
      const config = getContainerdConfig({rootDir: '/data/containerd'});
      config.should.include('root_path = "/data/containerd/snapshots"');
    });
  });
});
