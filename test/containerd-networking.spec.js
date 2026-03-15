/*
 * Tests for containerd networking (createNet, getNetwork, listNetworks).
 * @file containerd-networking.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const ContainerdContainer = require('./../lib/backends/containerd/containerd-container');

/**
 * Create a ContainerdContainer instance with a mocked _nerdctl method.
 *
 * The mock captures every call's args array into `calls` and resolves with
 * a configurable return value. This lets us verify that the correct nerdctl
 * CLI arguments are built without needing a real containerd socket.
 *
 * @param {Object} [overrides={}] - Per-test overrides.
 * @param {string|Function} [overrides.nerdctlReturn=''] - Value _nerdctl resolves with,
 *   or a function `(args) => string` for dynamic returns.
 * @param {Error} [overrides.nerdctlError=null] - If set, _nerdctl rejects with this error.
 * @return {{cc: ContainerdContainer, calls: Array<Array<string>>}}
 */
function createMockedInstance(overrides = {}) {
  const calls = [];
  const cc = new ContainerdContainer({debug: () => {}});

  cc._nerdctl = async (args, opts) => {
    calls.push(args);
    if (overrides.nerdctlError) throw overrides.nerdctlError;
    if (typeof overrides.nerdctlReturn === 'function') return overrides.nerdctlReturn(args);
    return overrides.nerdctlReturn || '';
  };

  return {cc, calls};
}

describe('containerd-networking', () => {
  // ===========================================================================
  // createNet
  // ===========================================================================
  describe('#createNet', () => {
    it('should build correct nerdctl args with lando label (no --internal)', async () => {
      const {cc, calls} = createMockedInstance({
        nerdctlReturn: args => {
          // network inspect returns JSON
          if (args[0] === 'network' && args[1] === 'inspect') {
            return JSON.stringify([{Name: 'my-net', Id: 'abc123'}]);
          }
          return 'abc123';
        },
      });

      await cc.createNet('my-net');

      // First call: network create
      const createArgs = calls[0];
      createArgs[0].should.equal('network');
      createArgs[1].should.equal('create');
      // nerdctl does not support --internal; should NOT be present
      expect(createArgs).to.not.include('--internal');
      expect(createArgs).to.include('--label');
      expect(createArgs).to.include('io.lando.container=TRUE');
      // Network name should be last
      createArgs[createArgs.length - 1].should.equal('my-net');
    });

    it('should not include --internal even when Internal option is not set', async () => {
      const {cc, calls} = createMockedInstance({
        nerdctlReturn: args => {
          if (args[0] === 'network' && args[1] === 'inspect') {
            return JSON.stringify([{Name: 'my-net', Id: 'abc123'}]);
          }
          return 'abc123';
        },
      });

      await cc.createNet('my-net', {Internal: false});

      const createArgs = calls[0];
      expect(createArgs).to.not.include('--internal');
      expect(createArgs).to.include('--label');
      expect(createArgs).to.include('io.lando.container=TRUE');
      createArgs[createArgs.length - 1].should.equal('my-net');
    });

    it('should include extra labels from opts.Labels', async () => {
      const {cc, calls} = createMockedInstance({
        nerdctlReturn: args => {
          if (args[0] === 'network' && args[1] === 'inspect') {
            return JSON.stringify([{Name: 'my-net', Id: 'abc123'}]);
          }
          return 'abc123';
        },
      });

      await cc.createNet('my-net', {
        Labels: {
          'com.example.env': 'production',
          'com.example.version': '2.0',
        },
      });

      const createArgs = calls[0];
      // Should have the default lando label plus the two extra labels
      expect(createArgs).to.include('io.lando.container=TRUE');
      expect(createArgs).to.include('com.example.env=production');
      expect(createArgs).to.include('com.example.version=2.0');
      createArgs[createArgs.length - 1].should.equal('my-net');
    });

    it('should call network inspect after creation and return parsed data', async () => {
      const inspectData = {Name: 'my-net', Id: 'abc123', Driver: 'bridge'};
      const {cc, calls} = createMockedInstance({
        nerdctlReturn: args => {
          if (args[0] === 'network' && args[1] === 'inspect') {
            return JSON.stringify([inspectData]);
          }
          return 'abc123';
        },
      });

      const result = await cc.createNet('my-net');

      // Should have made two calls: create and inspect
      calls.length.should.equal(2);
      calls[1][0].should.equal('network');
      calls[1][1].should.equal('inspect');
      calls[1][2].should.equal('my-net');

      result.should.deep.equal(inspectData);
    });
  });

  // ===========================================================================
  // getNetwork().connect
  // ===========================================================================
  describe('#getNetwork().connect', () => {
    it('should return a proxy with connect and disconnect methods', () => {
      const {cc} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      expect(network.connect).to.be.a('function');
      expect(network.disconnect).to.be.a('function');
    });

    it('should build correct nerdctl network connect args', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.connect({Container: 'my-container-id'});

      calls.length.should.equal(1);
      const args = calls[0];
      args.should.deep.equal(['network', 'connect', 'landonet', 'my-container-id']);
    });

    it('should include --alias flags for EndpointConfig.Aliases', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.connect({
        Container: 'my-container-id',
        EndpointConfig: {
          Aliases: ['web.myapp.internal', 'web'],
        },
      });

      calls.length.should.equal(1);
      const args = calls[0];
      args.should.deep.equal([
        'network', 'connect',
        '--alias', 'web.myapp.internal',
        '--alias', 'web',
        'landonet', 'my-container-id',
      ]);
    });

    it('should throw if Container is not provided', async () => {
      const {cc} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      try {
        await network.connect({});
        throw new Error('should have thrown');
      } catch (err) {
        err.message.should.include('Container is required');
      }
    });

    it('should throw if connect is called with no arguments', async () => {
      const {cc} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      try {
        await network.connect();
        throw new Error('should have thrown');
      } catch (err) {
        err.message.should.include('Container is required');
      }
    });

    it('should handle EndpointConfig without Aliases gracefully', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.connect({
        Container: 'cid-123',
        EndpointConfig: {},
      });

      calls.length.should.equal(1);
      const args = calls[0];
      args.should.deep.equal(['network', 'connect', 'landonet', 'cid-123']);
    });
  });

  // ===========================================================================
  // getNetwork().disconnect
  // ===========================================================================
  describe('#getNetwork().disconnect', () => {
    it('should build correct nerdctl network disconnect args', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.disconnect({Container: 'my-container-id'});

      calls.length.should.equal(1);
      const args = calls[0];
      args.should.deep.equal(['network', 'disconnect', 'landonet', 'my-container-id']);
    });

    it('should include --force flag when Force is true', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.disconnect({Container: 'my-container-id', Force: true});

      calls.length.should.equal(1);
      const args = calls[0];
      args.should.deep.equal(['network', 'disconnect', '--force', 'landonet', 'my-container-id']);
    });

    it('should not include --force flag when Force is false', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.disconnect({Container: 'my-container-id', Force: false});

      calls.length.should.equal(1);
      const args = calls[0];
      args.should.deep.equal(['network', 'disconnect', 'landonet', 'my-container-id']);
    });

    it('should throw if Container is not provided', async () => {
      const {cc} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      try {
        await network.disconnect({Force: true});
        throw new Error('should have thrown');
      } catch (err) {
        err.message.should.include('Container is required');
      }
    });

    it('should silently ignore "is not connected" errors (Docker parity)', async () => {
      const {cc} = createMockedInstance({
        nerdctlError: new Error('container abc123 is not connected to network landonet'),
      });
      const network = cc.getNetwork('landonet');

      // Should NOT throw
      await network.disconnect({Container: 'abc123'});
    });

    it('should re-throw non "is not connected" errors', async () => {
      const {cc} = createMockedInstance({
        nerdctlError: new Error('permission denied'),
      });
      const network = cc.getNetwork('landonet');

      try {
        await network.disconnect({Container: 'abc123'});
        throw new Error('should have thrown');
      } catch (err) {
        err.message.should.equal('permission denied');
      }
    });
  });

  // ===========================================================================
  // listNetworks
  // ===========================================================================
  describe('#listNetworks', () => {
    it('should filter networks by name', async () => {
      const {cc} = createMockedInstance({
        nerdctlReturn: [
          JSON.stringify({Name: 'lando_bridge_network', ID: 'abc123', Labels: ''}),
          JSON.stringify({Name: 'other-network', ID: 'def456', Labels: ''}),
          JSON.stringify({Name: 'lando_custom_net', ID: 'ghi789', Labels: ''}),
        ].join('\n'),
      });

      const result = await cc.listNetworks({filters: {name: ['lando']}});
      result.length.should.equal(2);
      result[0].Name.should.equal('lando_bridge_network');
      result[1].Name.should.equal('lando_custom_net');
    });

    it('should filter networks by id (prefix match)', async () => {
      const {cc} = createMockedInstance({
        nerdctlReturn: [
          JSON.stringify({Name: 'net1', ID: 'abc123def', Labels: ''}),
          JSON.stringify({Name: 'net2', ID: 'xyz789ghi', Labels: ''}),
        ].join('\n'),
      });

      const result = await cc.listNetworks({filters: {id: ['abc']}});
      result.length.should.equal(1);
      result[0].Name.should.equal('net1');
    });

    it('should filter networks by label', async () => {
      const {cc} = createMockedInstance({
        nerdctlReturn: [
          JSON.stringify({Name: 'net1', ID: 'abc', Labels: 'io.lando.container=TRUE'}),
          JSON.stringify({Name: 'net2', ID: 'def', Labels: 'other=label'}),
        ].join('\n'),
      });

      const result = await cc.listNetworks({filters: {label: ['io.lando.container=TRUE']}});
      result.length.should.equal(1);
      result[0].Name.should.equal('net1');
    });

    it('should return all networks when no filters are specified', async () => {
      const {cc} = createMockedInstance({
        nerdctlReturn: [
          JSON.stringify({Name: 'net1', ID: 'abc'}),
          JSON.stringify({Name: 'net2', ID: 'def'}),
          JSON.stringify({Name: 'net3', ID: 'ghi'}),
        ].join('\n'),
      });

      const result = await cc.listNetworks();
      result.length.should.equal(3);
    });

    it('should return empty array when nerdctl fails', async () => {
      const {cc} = createMockedInstance({
        nerdctlError: new Error('containerd not running'),
      });

      const result = await cc.listNetworks();
      result.should.deep.equal([]);
    });

    it('should return empty array when nerdctl returns empty output', async () => {
      const {cc} = createMockedInstance({nerdctlReturn: ''});

      const result = await cc.listNetworks();
      result.should.deep.equal([]);
    });

    it('should handle multiple name filters (match any)', async () => {
      const {cc} = createMockedInstance({
        nerdctlReturn: [
          JSON.stringify({Name: 'alpha-net', ID: 'a1'}),
          JSON.stringify({Name: 'beta-net', ID: 'b1'}),
          JSON.stringify({Name: 'gamma-net', ID: 'c1'}),
        ].join('\n'),
      });

      const result = await cc.listNetworks({filters: {name: ['alpha', 'gamma']}});
      result.length.should.equal(2);
      result[0].Name.should.equal('alpha-net');
      result[1].Name.should.equal('gamma-net');
    });
  });
});
