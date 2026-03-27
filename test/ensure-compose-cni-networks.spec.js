'use strict';

const {expect} = require('chai');
const mockFs = require('mock-fs');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

const ensureComposeCniNetworks = require('../utils/ensure-compose-cni-networks');

/**
 * Helper to create a mock compose file on the mock filesystem.
 *
 * @param {string} filePath - Path to write the compose file.
 * @param {Object} content - Compose file content as a JS object.
 */
const writeComposeFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, yaml.dump(content), 'utf8');
};

describe('ensure-compose-cni-networks', () => {
  const cniDir = '/tmp/test-cni';
  const composeDir = '/tmp/test-compose';

  afterEach(() => {
    mockFs.restore();
  });

  describe('default network handling', () => {
    it('should always ensure the _default network', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'test.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
      });

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});
      expect(result).to.include('myapp_default');
      expect(fs.existsSync(path.join(cniDir, 'nerdctl-myapp_default.conflist'))).to.be.true;
    });

    it('should ensure _default even when compose file has no networks section', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'minimal.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
      });

      const result = ensureComposeCniNetworks([composeFile], 'testproj', {cniNetconfPath: cniDir});
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.equal('testproj_default');
    });

    it('should ensure _default even when compose files array is empty', () => {
      mockFs({
        [cniDir]: {},
      });

      const result = ensureComposeCniNetworks([], 'emptyproj', {cniNetconfPath: cniDir});
      expect(result).to.include('emptyproj_default');
    });
  });

  describe('custom network extraction', () => {
    it('should ensure CNI configs for explicitly defined networks', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'custom-nets.yml');
      writeComposeFile(composeFile, {
        services: {
          web: {image: 'nginx', networks: ['frontend']},
          db: {image: 'postgres', networks: ['backend']},
        },
        networks: {
          frontend: {driver: 'bridge'},
          backend: {driver: 'bridge'},
        },
      });

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});

      expect(result).to.include('myapp_default');
      expect(result).to.include('myapp_frontend');
      expect(result).to.include('myapp_backend');
      expect(result).to.have.lengthOf(3);

      expect(fs.existsSync(path.join(cniDir, 'nerdctl-myapp_frontend.conflist'))).to.be.true;
      expect(fs.existsSync(path.join(cniDir, 'nerdctl-myapp_backend.conflist'))).to.be.true;
    });

    it('should use explicit name when network has name: property', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'named-net.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
        networks: {
          mynet: {name: 'custom-global-network', driver: 'bridge'},
        },
      });

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});

      expect(result).to.include('custom-global-network');
      expect(result).not.to.include('myapp_mynet');
      expect(fs.existsSync(path.join(cniDir, 'nerdctl-custom-global-network.conflist'))).to.be.true;
    });

    it('should handle networks with null/empty config', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'null-config.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
        networks: {
          mynet: null,
        },
      });

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});
      expect(result).to.include('myapp_mynet');
    });
  });

  describe('external network handling', () => {
    it('should skip networks with external: true', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'external-net.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
        networks: {
          landonet: {external: true},
          internal: {driver: 'bridge'},
        },
      });

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});

      expect(result).not.to.include('myapp_landonet');
      expect(result).not.to.include('landonet');
      expect(result).to.include('myapp_internal');
    });

    it('should skip networks with external as object (compose v2 syntax)', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'external-obj.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
        networks: {
          landonet: {external: {name: 'some_external_net'}},
        },
      });

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});
      expect(result).not.to.include('myapp_landonet');
      expect(result).not.to.include('some_external_net');
    });
  });

  describe('multiple compose files', () => {
    it('should merge networks from multiple compose files', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const file1 = path.join(composeDir, 'base.yml');
      const file2 = path.join(composeDir, 'override.yml');

      writeComposeFile(file1, {
        services: {web: {image: 'nginx'}},
        networks: {
          frontend: {driver: 'bridge'},
        },
      });

      writeComposeFile(file2, {
        services: {api: {image: 'node'}},
        networks: {
          backend: {driver: 'bridge'},
        },
      });

      const result = ensureComposeCniNetworks([file1, file2], 'myapp', {cniNetconfPath: cniDir});

      expect(result).to.include('myapp_default');
      expect(result).to.include('myapp_frontend');
      expect(result).to.include('myapp_backend');
      expect(result).to.have.lengthOf(3);
    });

    it('should let later files override network config from earlier files', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const file1 = path.join(composeDir, 'base.yml');
      const file2 = path.join(composeDir, 'override.yml');

      writeComposeFile(file1, {
        networks: {
          mynet: {driver: 'bridge'},
        },
      });

      // Later file changes name — should use the overridden name
      writeComposeFile(file2, {
        networks: {
          mynet: {name: 'overridden-name', driver: 'bridge'},
        },
      });

      const result = ensureComposeCniNetworks([file1, file2], 'myapp', {cniNetconfPath: cniDir});

      expect(result).to.include('overridden-name');
      expect(result).not.to.include('myapp_mynet');
    });
  });

  describe('proxy network scenario', () => {
    it('should handle the proxy compose pattern (edge network)', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      // This replicates _proxy.js builder output
      const composeFile = path.join(composeDir, 'proxy.yml');
      writeComposeFile(composeFile, {
        services: {
          proxy: {
            image: 'traefik:2.11.31',
            networks: ['edge'],
          },
        },
        networks: {
          edge: {driver: 'bridge'},
        },
      });

      const result = ensureComposeCniNetworks([composeFile], '_lando_', {cniNetconfPath: cniDir});

      expect(result).to.include('_lando__default');
      expect(result).to.include('_lando__edge');
    });
  });

  describe('deduplication', () => {
    it('should not duplicate _default if also explicitly defined', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'explicit-default.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
        networks: {
          default: {driver: 'bridge'},
        },
      });

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});

      // Should appear only once
      const defaultCount = result.filter(n => n === 'myapp_default').length;
      expect(defaultCount).to.equal(1);
    });
  });

  describe('error handling', () => {
    it('should gracefully handle missing compose files', () => {
      mockFs({
        [cniDir]: {},
      });

      // Non-existent file should not crash — just ensure _default
      const result = ensureComposeCniNetworks(['/nonexistent/compose.yml'], 'myapp', {cniNetconfPath: cniDir});
      expect(result).to.include('myapp_default');
    });

    it('should gracefully handle invalid YAML in compose files', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'invalid.yml');
      fs.mkdirSync(composeDir, {recursive: true});
      fs.writeFileSync(composeFile, '{{ invalid yaml {{', 'utf8');

      const result = ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});
      expect(result).to.include('myapp_default');
    });

    it('should call debug on parse errors', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'bad.yml');
      fs.mkdirSync(composeDir, {recursive: true});
      fs.writeFileSync(composeFile, '{{ bad {{', 'utf8');

      let debugCalled = false;
      const debug = () => { debugCalled = true; };

      ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir, debug});
      expect(debugCalled).to.be.true;
    });
  });

  describe('CNI conflist content', () => {
    it('should create valid CNI conflist JSON for each network', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'content-test.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
        networks: {
          custom: {driver: 'bridge'},
        },
      });

      ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});

      // Validate the conflist for the custom network
      const conflistPath = path.join(cniDir, 'nerdctl-myapp_custom.conflist');
      expect(fs.existsSync(conflistPath)).to.be.true;

      const conflist = JSON.parse(fs.readFileSync(conflistPath, 'utf8'));
      expect(conflist).to.have.property('cniVersion', '1.0.0');
      expect(conflist).to.have.property('name', 'myapp_custom');
      expect(conflist).to.have.property('plugins').that.is.an('array');
      expect(conflist.plugins[0]).to.have.property('type', 'bridge');
      expect(conflist.plugins[0].ipam).to.have.property('type', 'host-local');
    });

    it('should allocate unique subnets for each network', () => {
      mockFs({
        [cniDir]: {},
        [composeDir]: {},
      });

      const composeFile = path.join(composeDir, 'multi.yml');
      writeComposeFile(composeFile, {
        services: {web: {image: 'nginx'}},
        networks: {
          net1: {},
          net2: {},
          net3: {},
        },
      });

      ensureComposeCniNetworks([composeFile], 'myapp', {cniNetconfPath: cniDir});

      // Read all conflist files and extract subnets
      const subnets = new Set();
      const files = fs.readdirSync(cniDir).filter(f => f.endsWith('.conflist'));
      for (const file of files) {
        const conflist = JSON.parse(fs.readFileSync(path.join(cniDir, file), 'utf8'));
        const subnet = conflist.plugins[0].ipam.ranges[0][0].subnet;
        expect(subnets.has(subnet)).to.be.false;
        subnets.add(subnet);
      }

      // 4 networks: default + net1 + net2 + net3
      expect(subnets.size).to.equal(4);
    });
  });
});
