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
 * Create a ContainerdContainer instance with mocked Docker API methods.
 *
 * The mock captures network API calls so we can verify the containerd backend
 * routes network operations through the finch-daemon Docker API.
 *
 * @param {Object} [overrides={}] - Per-test overrides.
 * @param {Array<Object>} [overrides.networks=[]] - Network list returned by Docker API.
 * @param {Object} [overrides.inspectData] - Inspect result for getNetwork().inspect().
 * @param {Error} [overrides.disconnectError=null] - Error thrown by network disconnect.
 * @return {{cc: ContainerdContainer, calls: Array<Object>}}
 */
function createMockedInstance(overrides = {}) {
  const calls = [];
  const cc = new ContainerdContainer({debug: () => {}});

  cc.dockerode = {
    createNetwork: async opts => {
      calls.push({method: 'createNetwork', opts});
    },
    listNetworks: async () => overrides.networks || [],
    getNetwork: () => ({
      inspect: async () => overrides.inspectData || {Name: 'my-net', Id: 'abc123'},
      remove: async () => {
        calls.push({method: 'remove'});
      },
      connect: async opts => {
        calls.push({method: 'connect', opts});
      },
      disconnect: async opts => {
        if (overrides.disconnectError) throw overrides.disconnectError;
        calls.push({method: 'disconnect', opts});
      },
    }),
  };

  return {cc, calls};
}

describe('containerd-networking', () => {
  // ===========================================================================
  // createNet
  // ===========================================================================
  describe('#createNet', () => {
    it('should create a Docker API network with the lando label', async () => {
      const {cc, calls} = createMockedInstance();

      await cc.createNet('my-net');

      calls[0].method.should.equal('createNetwork');
      calls[0].opts.Name.should.equal('my-net');
      calls[0].opts.Labels.should.deep.equal({'io.lando.container': 'TRUE'});
      calls[0].opts.Attachable.should.equal(true);
    });

    it('should not include --internal even when Internal option is not set', async () => {
      const {cc, calls} = createMockedInstance();

      await cc.createNet('my-net', {Internal: false});

      expect(calls[0].opts).to.not.have.property('Internal');
    });

    it('should include extra labels from opts.Labels', async () => {
      const {cc, calls} = createMockedInstance();

      await cc.createNet('my-net', {
        Labels: {
          'com.example.env': 'production',
          'com.example.version': '2.0',
        },
      });

      calls[0].opts.Labels.should.deep.equal({
        'io.lando.container': 'TRUE',
        'com.example.env': 'production',
        'com.example.version': '2.0',
      });
    });

    it('should call network inspect after creation and return parsed data', async () => {
      const inspectData = {Name: 'my-net', Id: 'abc123', Driver: 'bridge'};
      const {cc, calls} = createMockedInstance({inspectData});

      const result = await cc.createNet('my-net');

      calls.length.should.equal(1);

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

    it('should proxy network connect through dockerode', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.connect({Container: 'my-container-id'});

      calls.length.should.equal(1);
      calls[0].should.deep.equal({method: 'connect', opts: {Container: 'my-container-id'}});
    });

    it('should preserve aliases on dockerode network connect', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.connect({
        Container: 'my-container-id',
        EndpointConfig: {
          Aliases: ['web.myapp.internal', 'web'],
        },
      });

      calls.length.should.equal(1);
      calls[0].should.deep.equal({
        method: 'connect',
        opts: {
          Container: 'my-container-id',
          EndpointConfig: {
            Aliases: ['web.myapp.internal', 'web'],
          },
        },
      });
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
      calls[0].should.deep.equal({method: 'connect', opts: {Container: 'cid-123', EndpointConfig: {}}});
    });
  });

  // ===========================================================================
  // getNetwork().disconnect
  // ===========================================================================
  describe('#getNetwork().disconnect', () => {
    it('should proxy network disconnect through dockerode', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.disconnect({Container: 'my-container-id'});

      calls.length.should.equal(1);
      calls[0].should.deep.equal({method: 'disconnect', opts: {Container: 'my-container-id'}});
    });

    it('should ignore Force when nerdctl does not support it', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.disconnect({Container: 'my-container-id', Force: true});

      calls.length.should.equal(1);
      calls[0].should.deep.equal({method: 'disconnect', opts: {Container: 'my-container-id', Force: true}});
    });

    it('should not include --force flag when Force is false', async () => {
      const {cc, calls} = createMockedInstance();
      const network = cc.getNetwork('landonet');

      await network.disconnect({Container: 'my-container-id', Force: false});

      calls.length.should.equal(1);
      calls[0].should.deep.equal({method: 'disconnect', opts: {Container: 'my-container-id', Force: false}});
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
      const {cc} = createMockedInstance({disconnectError: new Error('container abc123 is not connected to network landonet')});
      const network = cc.getNetwork('landonet');

      // Should NOT throw
      await network.disconnect({Container: 'abc123'});
    });

    it('should re-throw non "is not connected" errors', async () => {
      const {cc} = createMockedInstance({disconnectError: new Error('permission denied')});
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
        networks: [
          JSON.stringify({Name: 'lando_bridge_network', ID: 'abc123', Labels: ''}),
          JSON.stringify({Name: 'other-network', ID: 'def456', Labels: ''}),
          JSON.stringify({Name: 'lando_custom_net', ID: 'ghi789', Labels: ''}),
        ].map(JSON.parse),
      });

      const result = await cc.listNetworks({filters: {name: ['lando']}});
      result.length.should.equal(2);
      result[0].Name.should.equal('lando_bridge_network');
      result[1].Name.should.equal('lando_custom_net');
    });

    it('should filter networks by id (prefix match)', async () => {
      const {cc} = createMockedInstance({
        networks: [
          JSON.stringify({Name: 'net1', ID: 'abc123def', Labels: ''}),
          JSON.stringify({Name: 'net2', ID: 'xyz789ghi', Labels: ''}),
        ].map(JSON.parse),
      });

      const result = await cc.listNetworks({filters: {id: ['abc']}});
      result.length.should.equal(1);
      result[0].Name.should.equal('net1');
    });

    it('should filter networks by label', async () => {
      const {cc} = createMockedInstance({
        networks: [
          JSON.stringify({Name: 'net1', ID: 'abc', Labels: 'io.lando.container=TRUE'}),
          JSON.stringify({Name: 'net2', ID: 'def', Labels: 'other=label'}),
        ].map(JSON.parse),
      });

      const result = await cc.listNetworks({filters: {label: ['io.lando.container=TRUE']}});
      result.length.should.equal(1);
      result[0].Name.should.equal('net1');
    });

    it('should return all networks when no filters are specified', async () => {
      const {cc} = createMockedInstance({
        networks: [
          JSON.stringify({Name: 'net1', ID: 'abc'}),
          JSON.stringify({Name: 'net2', ID: 'def'}),
          JSON.stringify({Name: 'net3', ID: 'ghi'}),
        ].map(JSON.parse),
      });

      const result = await cc.listNetworks();
      result.length.should.equal(3);
    });

    it('should return empty array when nerdctl fails', async () => {
      const {cc} = createMockedInstance();
      cc.dockerode.listNetworks = async () => { throw new Error('containerd not running'); };

      const result = await cc.listNetworks();
      result.should.deep.equal([]);
    });

    it('should return empty array when nerdctl returns empty output', async () => {
      const {cc} = createMockedInstance({networks: []});

      const result = await cc.listNetworks();
      result.should.deep.equal([]);
    });

    it('should handle multiple name filters (match any)', async () => {
      const {cc} = createMockedInstance({
        networks: [
          JSON.stringify({Name: 'alpha-net', ID: 'a1'}),
          JSON.stringify({Name: 'beta-net', ID: 'b1'}),
          JSON.stringify({Name: 'gamma-net', ID: 'c1'}),
        ].map(JSON.parse),
      });

      const result = await cc.listNetworks({filters: {name: ['alpha', 'gamma']}});
      result.length.should.equal(2);
      result[0].Name.should.equal('alpha-net');
      result[1].Name.should.equal('gamma-net');
    });
  });
});
