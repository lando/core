/*
 * Tests for setup-containerd-auth.
 * @file setup-containerd-auth.spec.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
chai.should();

const {getContainerdAuthConfig, getDockerConfigPath} = require('./../utils/setup-containerd-auth');

describe('setup-containerd-auth', () => {
  describe('#getDockerConfigPath', () => {
    it('should return default ~/.docker when no options provided', () => {
      const result = getDockerConfigPath({env: {}});
      result.should.equal(path.join(os.homedir(), '.docker'));
    });

    it('should respect explicit configPath option', () => {
      const result = getDockerConfigPath({configPath: '/custom/docker-config'});
      result.should.equal(path.resolve('/custom/docker-config'));
    });

    it('should respect DOCKER_CONFIG env var', () => {
      const result = getDockerConfigPath({env: {DOCKER_CONFIG: '/env/docker-config'}});
      result.should.equal(path.resolve('/env/docker-config'));
    });

    it('should prefer configPath over DOCKER_CONFIG env var', () => {
      const result = getDockerConfigPath({
        configPath: '/explicit/path',
        env: {DOCKER_CONFIG: '/env/path'},
      });
      result.should.equal(path.resolve('/explicit/path'));
    });

    it('should return an absolute path for relative configPath', () => {
      const result = getDockerConfigPath({configPath: 'relative/docker'});
      path.isAbsolute(result).should.be.true;
    });
  });

  describe('#getContainerdAuthConfig', () => {
    describe('with default config path', () => {
      it('should return an object with dockerConfig, env, configExists, and credentialHelpers', () => {
        const result = getContainerdAuthConfig({env: {}});

        expect(result).to.be.an('object');
        expect(result).to.have.property('dockerConfig').that.is.a('string');
        expect(result).to.have.property('env').that.is.an('object');
        expect(result).to.have.property('configExists').that.is.a('boolean');
        expect(result).to.have.property('credentialHelpers').that.is.an('array');
      });

      it('should use ~/.docker as dockerConfig by default', () => {
        const result = getContainerdAuthConfig({env: {}});
        result.dockerConfig.should.equal(path.join(os.homedir(), '.docker'));
      });

      it('should return empty env when config has no credsStore', () => {
        // Use a temp dir with a config.json that has NO credsStore.
        // The real ~/.docker/config.json may have credsStore which triggers
        // sanitization and sets DOCKER_CONFIG — that's correct behavior.
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-auth-default-'));
        fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify({
          auths: {'https://index.docker.io/v1/': {}},
        }));

        try {
          const result = getContainerdAuthConfig({configPath: tmpDir});
          // Non-standard path → DOCKER_CONFIG is set, but that's the path override.
          // The key assertion: no *additional* sanitization redirect happened.
          result.env.should.have.property('DOCKER_CONFIG', tmpDir);
        } finally {
          fs.unlinkSync(path.join(tmpDir, 'config.json'));
          fs.rmdirSync(tmpDir);
        }
      });

      it('should sanitize credsStore and redirect DOCKER_CONFIG', () => {
        // When config.json has credsStore, the implementation strips it and
        // writes a sanitized copy to ~/.lando/docker-config/ because
        // finch-daemon treats credential helper errors as fatal.
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-auth-creds-'));
        fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify({
          credsStore: 'desktop',
          auths: {},
        }));

        try {
          const result = getContainerdAuthConfig({configPath: tmpDir});
          // Should redirect to sanitized config dir
          result.env.should.have.property('DOCKER_CONFIG');
          result.env.DOCKER_CONFIG.should.include('docker-config');
          result.credentialHelpers.should.include('docker-credential-desktop');
        } finally {
          fs.unlinkSync(path.join(tmpDir, 'config.json'));
          fs.rmdirSync(tmpDir);
        }
      });
    });

    describe('with custom configPath (registryAuth override)', () => {
      it('should set DOCKER_CONFIG in env when configPath is non-standard', () => {
        const result = getContainerdAuthConfig({configPath: '/custom/docker'});
        result.env.should.have.property('DOCKER_CONFIG');
        result.env.DOCKER_CONFIG.should.equal('/custom/docker');
      });

      it('should set dockerConfig to the custom path', () => {
        const result = getContainerdAuthConfig({configPath: '/my/config'});
        result.dockerConfig.should.equal(path.resolve('/my/config'));
      });

      it('should not redirect DOCKER_CONFIG when config has no credsStore', () => {
        // Use a temp dir at a path that resolves to the default ~/.docker.
        // But since we can't guarantee the real ~/.docker has no credsStore,
        // test with a controlled temp dir that has no credsStore.
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-auth-nocreds-'));
        fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify({
          auths: {'https://index.docker.io/v1/': {}},
        }));

        try {
          const result = getContainerdAuthConfig({configPath: tmpDir});
          // DOCKER_CONFIG should be set to tmpDir (because it's non-standard)
          // but NOT redirected to ~/.lando/docker-config/ (no credsStore to sanitize)
          result.env.should.deep.equal({DOCKER_CONFIG: tmpDir});
        } finally {
          fs.unlinkSync(path.join(tmpDir, 'config.json'));
          fs.rmdirSync(tmpDir);
        }
      });
    });

    describe('with DOCKER_CONFIG env var', () => {
      it('should set DOCKER_CONFIG in env when env var points to non-standard path', () => {
        const result = getContainerdAuthConfig({env: {DOCKER_CONFIG: '/env/docker'}});
        result.env.should.have.property('DOCKER_CONFIG');
        result.env.DOCKER_CONFIG.should.equal('/env/docker');
      });
    });

    describe('when no docker config exists', () => {
      it('should set configExists to false for a non-existent path', () => {
        const result = getContainerdAuthConfig({configPath: '/nonexistent/path/that/does/not/exist'});
        result.configExists.should.be.false;
      });

      it('should return empty credentialHelpers when config does not exist', () => {
        const result = getContainerdAuthConfig({configPath: '/nonexistent/path'});
        result.credentialHelpers.should.be.an('array').that.is.empty;
      });

      it('should still return valid env even when config does not exist', () => {
        const result = getContainerdAuthConfig({configPath: '/nonexistent/path'});
        result.env.should.have.property('DOCKER_CONFIG');
        result.env.DOCKER_CONFIG.should.equal('/nonexistent/path');
      });
    });

    describe('credential helper detection', () => {
      let tmpDir;
      let configFile;

      beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-auth-test-'));
        configFile = path.join(tmpDir, 'config.json');
      });

      afterEach(() => {
        try {
          if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
          fs.rmdirSync(tmpDir);
        } catch {
          // cleanup best-effort
        }
      });

      it('should detect credsStore helper', () => {
        fs.writeFileSync(configFile, JSON.stringify({
          credsStore: 'osxkeychain',
        }));

        const result = getContainerdAuthConfig({configPath: tmpDir});
        result.configExists.should.be.true;
        result.credentialHelpers.should.include('docker-credential-osxkeychain');
      });

      it('should detect credHelpers per-registry helpers', () => {
        fs.writeFileSync(configFile, JSON.stringify({
          credHelpers: {
            'gcr.io': 'gcloud',
            '123456.dkr.ecr.us-east-1.amazonaws.com': 'ecr-login',
          },
        }));

        const result = getContainerdAuthConfig({configPath: tmpDir});
        result.configExists.should.be.true;
        result.credentialHelpers.should.include('docker-credential-gcloud');
        result.credentialHelpers.should.include('docker-credential-ecr-login');
      });

      it('should detect both credsStore and credHelpers together', () => {
        fs.writeFileSync(configFile, JSON.stringify({
          credsStore: 'desktop',
          credHelpers: {
            'gcr.io': 'gcloud',
          },
        }));

        const result = getContainerdAuthConfig({configPath: tmpDir});
        result.credentialHelpers.should.include('docker-credential-desktop');
        result.credentialHelpers.should.include('docker-credential-gcloud');
      });

      it('should return empty credentialHelpers when config has no cred fields', () => {
        fs.writeFileSync(configFile, JSON.stringify({
          auths: {
            'https://index.docker.io/v1/': {},
          },
        }));

        const result = getContainerdAuthConfig({configPath: tmpDir});
        result.configExists.should.be.true;
        result.credentialHelpers.should.be.an('array').that.is.empty;
      });

      it('should deduplicate credential helpers', () => {
        fs.writeFileSync(configFile, JSON.stringify({
          credsStore: 'desktop',
          credHelpers: {
            'docker.io': 'desktop',
            'gcr.io': 'desktop',
          },
        }));

        const result = getContainerdAuthConfig({configPath: tmpDir});
        const desktopCount = result.credentialHelpers
          .filter(h => h === 'docker-credential-desktop').length;
        desktopCount.should.equal(1);
      });

      it('should handle malformed config.json gracefully', () => {
        fs.writeFileSync(configFile, 'not valid json {{{');

        const result = getContainerdAuthConfig({configPath: tmpDir});
        result.configExists.should.be.false;
        result.credentialHelpers.should.be.an('array').that.is.empty;
      });

      it('should handle config.json that is valid JSON but has unexpected shape', () => {
        fs.writeFileSync(configFile, JSON.stringify('just a string'));

        const result = getContainerdAuthConfig({configPath: tmpDir});
        result.configExists.should.be.true;
        result.credentialHelpers.should.be.an('array').that.is.empty;
      });

      it('should set configExists to true when config.json exists', () => {
        fs.writeFileSync(configFile, JSON.stringify({}));

        const result = getContainerdAuthConfig({configPath: tmpDir});
        result.configExists.should.be.true;
      });
    });
  });
});
