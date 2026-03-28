'use strict';

const {expect} = require('chai');
const sinon = require('sinon');
const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');

const ensureCniNetwork = require('../utils/ensure-cni-network');

/**
 * Helper to create a mock CNI conflist file for testing subnet allocation.
 *
 * @param {string} dir - CNI config directory.
 * @param {string} networkName - Network name.
 * @param {number} subnetOctet - Third octet of the 10.4.x.0/24 subnet.
 * @return {string} Path to the created conflist file.
 */
const writeConflist = (dir, networkName, subnetOctet) => {
  const filePath = path.join(dir, `nerdctl-${networkName}.conflist`);
  const content = {
    cniVersion: '1.0.0',
    name: networkName,
    plugins: [{
      type: 'bridge',
      ipam: {
        type: 'host-local',
        ranges: [[{
          gateway: `10.4.${subnetOctet}.1`,
          subnet: `10.4.${subnetOctet}.0/24`,
        }]],
      },
    }],
  };
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  return filePath;
};

describe('ensure-cni-network', () => {
  const cniDir = '/tmp/test-cni';

  afterEach(() => {
    mockFs.restore();
  });

  describe('conflist creation', () => {
    it('should create a new conflist when none exists', () => {
      mockFs({[cniDir]: {}});

      const result = ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});

      expect(result).to.be.true;
      expect(fs.existsSync(path.join(cniDir, 'nerdctl-myapp_default.conflist'))).to.be.true;
    });

    it('should return false when conflist already exists', () => {
      mockFs({[cniDir]: {}});

      // Create first
      ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});
      // Second call should be a no-op
      const result = ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});

      expect(result).to.be.false;
    });

    it('should create valid JSON conflist content', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir});

      const conflistPath = path.join(cniDir, 'nerdctl-testnet.conflist');
      const content = JSON.parse(fs.readFileSync(conflistPath, 'utf8'));

      expect(content).to.have.property('cniVersion', '1.0.0');
      expect(content).to.have.property('name', 'testnet');
      expect(content).to.have.property('nerdctlID').that.is.a('string');
      expect(content.nerdctlID).to.have.lengthOf(64); // 32 bytes hex
      expect(content).to.have.property('nerdctlLabels').that.deep.equals({});
      expect(content).to.have.property('plugins').that.is.an('array');
    });

    it('should include bridge, portmap, firewall, and tuning plugins', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir});

      const conflistPath = path.join(cniDir, 'nerdctl-testnet.conflist');
      const content = JSON.parse(fs.readFileSync(conflistPath, 'utf8'));
      const pluginTypes = content.plugins.map(p => p.type);

      expect(pluginTypes).to.deep.equal(['bridge', 'portmap', 'firewall', 'tuning']);
    });

    it('should configure portmap plugin with port mapping capabilities', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir});

      const conflistPath = path.join(cniDir, 'nerdctl-testnet.conflist');
      const content = JSON.parse(fs.readFileSync(conflistPath, 'utf8'));
      const portmap = content.plugins.find(p => p.type === 'portmap');

      expect(portmap).to.exist;
      expect(portmap.capabilities).to.deep.equal({portMappings: true});
    });

    it('should NOT include tc-redirect-tap plugin', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir});

      const conflistPath = path.join(cniDir, 'nerdctl-testnet.conflist');
      const content = JSON.parse(fs.readFileSync(conflistPath, 'utf8'));
      const pluginTypes = content.plugins.map(p => p.type);

      expect(pluginTypes).to.not.include('tc-redirect-tap');
    });

    it('should configure the bridge plugin with correct properties', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir});

      const conflistPath = path.join(cniDir, 'nerdctl-testnet.conflist');
      const content = JSON.parse(fs.readFileSync(conflistPath, 'utf8'));
      const bridge = content.plugins[0];

      expect(bridge.isGateway).to.be.true;
      expect(bridge.ipMasq).to.be.true;
      expect(bridge.hairpinMode).to.be.true;
      expect(bridge.bridge).to.match(/^br-[a-f0-9]{12}$/);
    });

    it('should generate unique nerdctlID for each conflist', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('net1', {cniNetconfPath: cniDir});
      ensureCniNetwork('net2', {cniNetconfPath: cniDir});

      const c1 = JSON.parse(fs.readFileSync(path.join(cniDir, 'nerdctl-net1.conflist'), 'utf8'));
      const c2 = JSON.parse(fs.readFileSync(path.join(cniDir, 'nerdctl-net2.conflist'), 'utf8'));

      expect(c1.nerdctlID).to.not.equal(c2.nerdctlID);
    });
  });

  describe('subnet allocation', () => {
    it('should allocate subnet 10.4.1.0/24 when no existing configs', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('first_net', {cniNetconfPath: cniDir});

      const content = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-first_net.conflist'), 'utf8'),
      );
      const subnet = content.plugins[0].ipam.ranges[0][0].subnet;
      const gateway = content.plugins[0].ipam.ranges[0][0].gateway;

      expect(subnet).to.equal('10.4.1.0/24');
      expect(gateway).to.equal('10.4.1.1');
    });

    it('should increment subnet past existing configs', () => {
      mockFs({[cniDir]: {}});

      // Pre-populate with subnet 10.4.3.0/24
      writeConflist(cniDir, 'existing', 3);

      ensureCniNetwork('newnet', {cniNetconfPath: cniDir});

      const content = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-newnet.conflist'), 'utf8'),
      );
      const subnet = content.plugins[0].ipam.ranges[0][0].subnet;

      expect(subnet).to.equal('10.4.4.0/24');
    });

    it('should find the max subnet across multiple existing configs', () => {
      mockFs({[cniDir]: {}});

      writeConflist(cniDir, 'net_a', 1);
      writeConflist(cniDir, 'net_b', 5);
      writeConflist(cniDir, 'net_c', 3);

      ensureCniNetwork('newnet', {cniNetconfPath: cniDir});

      const content = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-newnet.conflist'), 'utf8'),
      );
      const subnet = content.plugins[0].ipam.ranges[0][0].subnet;

      // Should be 5 + 1 = 6
      expect(subnet).to.equal('10.4.6.0/24');
    });

    it('should allocate sequential subnets for multiple new networks', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('net1', {cniNetconfPath: cniDir});
      ensureCniNetwork('net2', {cniNetconfPath: cniDir});
      ensureCniNetwork('net3', {cniNetconfPath: cniDir});

      const subnets = ['net1', 'net2', 'net3'].map(name => {
        const c = JSON.parse(fs.readFileSync(path.join(cniDir, `nerdctl-${name}.conflist`), 'utf8'));
        return c.plugins[0].ipam.ranges[0][0].subnet;
      });

      expect(subnets).to.deep.equal([
        '10.4.1.0/24',
        '10.4.2.0/24',
        '10.4.3.0/24',
      ]);
    });

    it('should return false when all 255 subnets are exhausted', () => {
      // Build a directory with existing configs using subnets 1-255
      const dirContents = {};
      for (let i = 1; i <= 255; i++) {
        const name = `net_${i}`;
        dirContents[`nerdctl-${name}.conflist`] = JSON.stringify({
          plugins: [{
            type: 'bridge',
            ipam: {ranges: [[{subnet: `10.4.${i}.0/24`}]]},
          }],
        });
      }

      mockFs({[cniDir]: dirContents});

      const result = ensureCniNetwork('one_too_many', {cniNetconfPath: cniDir});

      expect(result).to.be.false;
    });

    it('should skip invalid JSON files when scanning for max subnet', () => {
      mockFs({
        [cniDir]: {
          'nerdctl-valid.conflist': JSON.stringify({
            plugins: [{
              type: 'bridge',
              ipam: {ranges: [[{subnet: '10.4.2.0/24'}]]},
            }],
          }),
          'nerdctl-broken.conflist': '{{ not json',
        },
      });

      ensureCniNetwork('newnet', {cniNetconfPath: cniDir});

      const content = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-newnet.conflist'), 'utf8'),
      );
      // Should still find max from valid file (2) and use 3
      expect(content.plugins[0].ipam.ranges[0][0].subnet).to.equal('10.4.3.0/24');
    });

    it('should skip conflist files with non-matching subnet patterns', () => {
      mockFs({
        [cniDir]: {
          'nerdctl-other.conflist': JSON.stringify({
            plugins: [{
              type: 'bridge',
              ipam: {ranges: [[{subnet: '192.168.1.0/24'}]]},
            }],
          }),
        },
      });

      ensureCniNetwork('newnet', {cniNetconfPath: cniDir});

      const content = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-newnet.conflist'), 'utf8'),
      );
      // 192.168 doesn't match 10.4.x pattern, so maxSubnet stays 0, new gets 1
      expect(content.plugins[0].ipam.ranges[0][0].subnet).to.equal('10.4.1.0/24');
    });
  });

  describe('IPAM routes', () => {
    it('should include a default route', () => {
      mockFs({[cniDir]: {}});

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir});

      const content = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-testnet.conflist'), 'utf8'),
      );
      const routes = content.plugins[0].ipam.routes;

      expect(routes).to.deep.equal([{dst: '0.0.0.0/0'}]);
    });
  });

  describe('error handling', () => {
    it('should throw on EACCES permission error with helpful message', () => {
      mockFs({[cniDir]: {}});

      // Stub writeFileSync to simulate EACCES after mock-fs is set up
      const eaccesErr = new Error('EACCES: permission denied');
      eaccesErr.code = 'EACCES';
      const writeStub = sinon.stub(fs, 'writeFileSync').throws(eaccesErr);

      try {
        let thrown;
        try {
          ensureCniNetwork('testnet', {cniNetconfPath: cniDir});
        } catch (err) {
          thrown = err;
        }
        expect(thrown).to.be.an.instanceOf(Error);
        expect(thrown.message).to.match(/Permission denied/);
        expect(thrown.message).to.include('lando setup');
      } finally {
        writeStub.restore();
      }
    });

    it('should return false for non-permission write errors', () => {
      // Use a path where the parent directory doesn't exist
      // mock-fs won't auto-create parents, so rename will fail
      const badDir = '/tmp/nonexistent-parent/cni';
      mockFs({});

      const result = ensureCniNetwork('testnet', {cniNetconfPath: badDir});
      expect(result).to.be.false;
    });

    it('should handle non-existent CNI directory gracefully when scanning', () => {
      // Directory doesn't exist at all — scanning should not throw
      mockFs({});

      // Will fail on write but the scan part should not throw
      const result = ensureCniNetwork('testnet', {cniNetconfPath: '/nonexistent/dir'});
      expect(result).to.be.false;
    });
  });

  describe('debug logging', () => {
    it('should call debug when conflist already exists', () => {
      mockFs({[cniDir]: {}});

      const messages = [];
      const debug = (...args) => messages.push(args);

      // Create first, then check debug on second call
      ensureCniNetwork('testnet', {cniNetconfPath: cniDir, debug});
      ensureCniNetwork('testnet', {cniNetconfPath: cniDir, debug});

      const existsMsg = messages.find(m => m[0].includes('already exists'));
      expect(existsMsg).to.exist;
    });

    it('should call debug with subnet info on successful creation', () => {
      mockFs({[cniDir]: {}});

      const messages = [];
      const debug = (...args) => messages.push(args);

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir, debug});

      const createdMsg = messages.find(m => m[0].includes('created CNI conflist'));
      expect(createdMsg).to.exist;
    });

    it('should call debug when subnets are exhausted', () => {
      const dirContents = {};
      for (let i = 1; i <= 255; i++) {
        dirContents[`nerdctl-net${i}.conflist`] = JSON.stringify({
          plugins: [{type: 'bridge', ipam: {ranges: [[{subnet: `10.4.${i}.0/24`}]]}}],
        });
      }
      mockFs({[cniDir]: dirContents});

      const messages = [];
      const debug = (...args) => messages.push(args);

      ensureCniNetwork('overflow', {cniNetconfPath: cniDir, debug});

      const exhaustedMsg = messages.find(m => m[0].includes('no available subnets'));
      expect(exhaustedMsg).to.exist;
    });
  });

  describe('options', () => {
    it('should use default cniNetconfPath when not provided', () => {
      // We can't test the actual default path (/etc/lando/cni/finch) without root,
      // but we can verify the conflist path construction
      mockFs({'/etc/lando/cni/finch': {}});

      const result = ensureCniNetwork('testnet');

      expect(result).to.be.true;
      expect(fs.existsSync('/etc/lando/cni/finch/nerdctl-testnet.conflist')).to.be.true;
    });

    it('should use custom cniNetconfPath from opts', () => {
      const customDir = '/custom/cni/path';
      mockFs({[customDir]: {}});

      ensureCniNetwork('testnet', {cniNetconfPath: customDir});

      expect(fs.existsSync(path.join(customDir, 'nerdctl-testnet.conflist'))).to.be.true;
    });

    it('should work with no opts argument at all', () => {
      mockFs({'/etc/lando/cni/finch': {}});

      // Should not throw
      const result = ensureCniNetwork('testnet');
      expect(result).to.be.true;
    });
  });

  describe('conflist migration', () => {
    it('should migrate old conflist with tc-redirect-tap to new plugin chain', () => {
      const oldConflist = {
        cniVersion: '1.0.0',
        name: 'myapp_default',
        nerdctlID: 'a'.repeat(64),
        nerdctlLabels: {},
        plugins: [
          {
            type: 'bridge',
            bridge: 'br-aaaaaaaaaaaa',
            isGateway: true,
            ipMasq: true,
            hairpinMode: true,
            ipam: {
              ranges: [[{gateway: '10.4.3.1', subnet: '10.4.3.0/24'}]],
              routes: [{dst: '0.0.0.0/0'}],
              type: 'host-local',
            },
          },
          {type: 'firewall'},
          {type: 'tc-redirect-tap'},
        ],
      };

      mockFs({
        [cniDir]: {
          'nerdctl-myapp_default.conflist': JSON.stringify(oldConflist, null, 2),
        },
      });

      const result = ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});

      expect(result).to.be.true;

      const updated = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-myapp_default.conflist'), 'utf8'),
      );
      const pluginTypes = updated.plugins.map(p => p.type);
      expect(pluginTypes).to.deep.equal(['bridge', 'portmap', 'firewall', 'tuning']);
    });

    it('should preserve subnet during migration', () => {
      const oldConflist = {
        cniVersion: '1.0.0',
        name: 'myapp_default',
        nerdctlID: 'b'.repeat(64),
        nerdctlLabels: {},
        plugins: [
          {
            type: 'bridge',
            bridge: 'br-bbbbbbbbbbbb',
            isGateway: true,
            ipMasq: true,
            hairpinMode: true,
            ipam: {
              ranges: [[{gateway: '10.4.7.1', subnet: '10.4.7.0/24'}]],
              routes: [{dst: '0.0.0.0/0'}],
              type: 'host-local',
            },
          },
          {type: 'firewall'},
          {type: 'tc-redirect-tap'},
        ],
      };

      mockFs({
        [cniDir]: {
          'nerdctl-myapp_default.conflist': JSON.stringify(oldConflist, null, 2),
        },
      });

      ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});

      const updated = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-myapp_default.conflist'), 'utf8'),
      );
      const subnet = updated.plugins[0].ipam.ranges[0][0].subnet;
      const gateway = updated.plugins[0].ipam.ranges[0][0].gateway;

      expect(subnet).to.equal('10.4.7.0/24');
      expect(gateway).to.equal('10.4.7.1');
    });

    it('should preserve bridge name during migration', () => {
      const oldConflist = {
        cniVersion: '1.0.0',
        name: 'myapp_default',
        nerdctlID: 'c'.repeat(64),
        nerdctlLabels: {},
        plugins: [
          {
            type: 'bridge',
            bridge: 'br-cccccccccccc',
            isGateway: true,
            ipMasq: true,
            ipam: {
              ranges: [[{gateway: '10.4.2.1', subnet: '10.4.2.0/24'}]],
              routes: [{dst: '0.0.0.0/0'}],
              type: 'host-local',
            },
          },
          {type: 'firewall'},
          {type: 'tc-redirect-tap'},
        ],
      };

      mockFs({
        [cniDir]: {
          'nerdctl-myapp_default.conflist': JSON.stringify(oldConflist, null, 2),
        },
      });

      ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});

      const updated = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-myapp_default.conflist'), 'utf8'),
      );

      expect(updated.plugins[0].bridge).to.equal('br-cccccccccccc');
    });

    it('should preserve nerdctlID during migration', () => {
      const nerdctlID = 'd'.repeat(64);
      const oldConflist = {
        cniVersion: '1.0.0',
        name: 'myapp_default',
        nerdctlID,
        nerdctlLabels: {foo: 'bar'},
        plugins: [
          {
            type: 'bridge',
            bridge: 'br-dddddddddddd',
            isGateway: true,
            ipMasq: true,
            ipam: {
              ranges: [[{gateway: '10.4.1.1', subnet: '10.4.1.0/24'}]],
              routes: [{dst: '0.0.0.0/0'}],
              type: 'host-local',
            },
          },
          {type: 'firewall'},
          {type: 'tc-redirect-tap'},
        ],
      };

      mockFs({
        [cniDir]: {
          'nerdctl-myapp_default.conflist': JSON.stringify(oldConflist, null, 2),
        },
      });

      ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});

      const updated = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-myapp_default.conflist'), 'utf8'),
      );

      expect(updated.nerdctlID).to.equal(nerdctlID);
      expect(updated.nerdctlLabels).to.deep.equal({foo: 'bar'});
    });

    it('should return false for conflist with correct plugin chain', () => {
      mockFs({[cniDir]: {}});

      // First call creates with correct plugins
      ensureCniNetwork('testnet', {cniNetconfPath: cniDir});
      // Second call should detect correct plugins and skip
      const result = ensureCniNetwork('testnet', {cniNetconfPath: cniDir});

      expect(result).to.be.false;
    });

    it('should migrate conflist missing portmap and tuning plugins', () => {
      const oldConflist = {
        cniVersion: '1.0.0',
        name: 'myapp_default',
        nerdctlID: 'e'.repeat(64),
        nerdctlLabels: {},
        plugins: [
          {
            type: 'bridge',
            bridge: 'br-eeeeeeeeeeee',
            isGateway: true,
            ipMasq: true,
            ipam: {
              ranges: [[{gateway: '10.4.5.1', subnet: '10.4.5.0/24'}]],
              routes: [{dst: '0.0.0.0/0'}],
              type: 'host-local',
            },
          },
          {type: 'firewall'},
        ],
      };

      mockFs({
        [cniDir]: {
          'nerdctl-myapp_default.conflist': JSON.stringify(oldConflist, null, 2),
        },
      });

      const result = ensureCniNetwork('myapp_default', {cniNetconfPath: cniDir});

      expect(result).to.be.true;

      const updated = JSON.parse(
        fs.readFileSync(path.join(cniDir, 'nerdctl-myapp_default.conflist'), 'utf8'),
      );
      const pluginTypes = updated.plugins.map(p => p.type);
      expect(pluginTypes).to.deep.equal(['bridge', 'portmap', 'firewall', 'tuning']);
    });

    it('should log debug message during migration', () => {
      const oldConflist = {
        cniVersion: '1.0.0',
        name: 'testnet',
        nerdctlID: 'f'.repeat(64),
        nerdctlLabels: {},
        plugins: [
          {
            type: 'bridge',
            bridge: 'br-ffffffffffff',
            isGateway: true,
            ipMasq: true,
            ipam: {
              ranges: [[{gateway: '10.4.1.1', subnet: '10.4.1.0/24'}]],
              routes: [{dst: '0.0.0.0/0'}],
              type: 'host-local',
            },
          },
          {type: 'firewall'},
          {type: 'tc-redirect-tap'},
        ],
      };

      mockFs({
        [cniDir]: {
          'nerdctl-testnet.conflist': JSON.stringify(oldConflist, null, 2),
        },
      });

      const messages = [];
      const debug = (...args) => messages.push(args);

      ensureCniNetwork('testnet', {cniNetconfPath: cniDir, debug});

      const migrateMsg = messages.find(m => m[0].includes('stale plugin chain'));
      expect(migrateMsg).to.exist;
      const doneMsg = messages.find(m => m[0].includes('migrated CNI conflist'));
      expect(doneMsg).to.exist;
    });
  });
});
