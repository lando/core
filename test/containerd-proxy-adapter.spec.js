'use strict';

const {expect} = require('chai');
const sinon = require('sinon');
const mockFs = require('mock-fs');

describe('ContainerdProxyAdapter', () => {
  let ContainerdProxyAdapter;

  before(() => {
    ContainerdProxyAdapter = require('../lib/backends/containerd/proxy-adapter');
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('constructor', () => {
    it('should use default finch socket path from get-containerd-paths', () => {
      const adapter = new ContainerdProxyAdapter({});
      expect(adapter.finchSocket).to.equal('/run/lando/finch.sock');
    });

    it('should accept a custom finch socket path', () => {
      const adapter = new ContainerdProxyAdapter({finchSocket: '/custom/finch.sock'});
      expect(adapter.finchSocket).to.equal('/custom/finch.sock');
    });

    it('should accept config to derive paths', () => {
      const adapter = new ContainerdProxyAdapter({
        config: {finchDaemonSocket: '/my/custom/finch.sock'},
      });
      expect(adapter.finchSocket).to.equal('/my/custom/finch.sock');
    });

    it('should use provided debug function', () => {
      const debugFn = sinon.spy();
      const adapter = new ContainerdProxyAdapter({debug: debugFn});
      expect(adapter.debug).to.equal(debugFn);
    });
  });

  describe('#ensureProxyNetworks', () => {
    it('should ensure CNI configs for both edge and default networks', () => {
      const cniDir = '/tmp/test-cni';
      mockFs({
        [cniDir]: {},
      });

      const adapter = new ContainerdProxyAdapter({});
      const results = adapter.ensureProxyNetworks('landoproxyhyperion5000gandalfedition', {
        cniNetconfPath: cniDir,
      });

      expect(results).to.have.property('landoproxyhyperion5000gandalfedition_edge');
      expect(results).to.have.property('landoproxyhyperion5000gandalfedition_default');
    });

    it('should return true for networks that were newly created', () => {
      const cniDir = '/tmp/test-cni-new';
      mockFs({
        [cniDir]: {},
      });

      const adapter = new ContainerdProxyAdapter({});
      const results = adapter.ensureProxyNetworks('myproxy', {
        cniNetconfPath: cniDir,
      });

      expect(results['myproxy_edge']).to.equal(true);
      expect(results['myproxy_default']).to.equal(true);
    });

    it('should return false for networks that already have CNI configs', () => {
      const cniDir = '/tmp/test-cni-existing';
      // Use the expected plugin chain so the conflist is treated as up-to-date
      // (empty plugins: [] would trigger migration and return true)
      const validPlugins = [
        {type: 'bridge', bridge: 'br-aaaaaaaaaaaa', isGateway: true, ipMasq: true, hairpinMode: true,
          ipam: {ranges: [[{gateway: '10.4.1.1', subnet: '10.4.1.0/24'}]], routes: [{dst: '0.0.0.0/0'}], type: 'host-local'}},
        {type: 'portmap', capabilities: {portMappings: true}},
        {type: 'firewall'},
        {type: 'tuning'},
      ];
      const validPlugins2 = [
        {type: 'bridge', bridge: 'br-bbbbbbbbbbbb', isGateway: true, ipMasq: true, hairpinMode: true,
          ipam: {ranges: [[{gateway: '10.4.2.1', subnet: '10.4.2.0/24'}]], routes: [{dst: '0.0.0.0/0'}], type: 'host-local'}},
        {type: 'portmap', capabilities: {portMappings: true}},
        {type: 'firewall'},
        {type: 'tuning'},
      ];
      mockFs({
        [cniDir]: {
          'nerdctl-myproxy_edge.conflist': JSON.stringify({cniVersion: '1.0.0', name: 'myproxy_edge', plugins: validPlugins}),
          'nerdctl-myproxy_default.conflist': JSON.stringify({cniVersion: '1.0.0', name: 'myproxy_default', plugins: validPlugins2}),
        },
      });

      const adapter = new ContainerdProxyAdapter({});
      const results = adapter.ensureProxyNetworks('myproxy', {
        cniNetconfPath: cniDir,
      });

      expect(results['myproxy_edge']).to.equal(false);
      expect(results['myproxy_default']).to.equal(false);
    });

    it('should pass debug function to ensureCniNetwork', () => {
      const cniDir = '/tmp/test-cni-debug';
      mockFs({
        [cniDir]: {},
      });

      const debugFn = sinon.spy();
      const adapter = new ContainerdProxyAdapter({debug: debugFn});
      adapter.ensureProxyNetworks('myproxy', {
        cniNetconfPath: cniDir,
      });

      expect(debugFn.called).to.equal(true);
    });
  });

  describe('#ensureAppProxyNetwork', () => {
    it('should ensure CNI config for the specified proxy network', () => {
      const cniDir = '/tmp/test-cni-app';
      mockFs({
        [cniDir]: {},
      });

      const adapter = new ContainerdProxyAdapter({});
      const result = adapter.ensureAppProxyNetwork('landoproxyhyperion5000gandalfedition_edge', {
        cniNetconfPath: cniDir,
      });

      expect(result).to.equal(true);
    });

    it('should return false if config already exists', () => {
      const cniDir = '/tmp/test-cni-app-existing';
      const networkName = 'landoproxyhyperion5000gandalfedition_edge';
      // Use the expected plugin chain so the conflist is treated as up-to-date
      const validPlugins = [
        {type: 'bridge', bridge: 'br-aaaaaaaaaaaa', isGateway: true, ipMasq: true, hairpinMode: true,
          ipam: {ranges: [[{gateway: '10.4.1.1', subnet: '10.4.1.0/24'}]], routes: [{dst: '0.0.0.0/0'}], type: 'host-local'}},
        {type: 'portmap', capabilities: {portMappings: true}},
        {type: 'firewall'},
        {type: 'tuning'},
      ];
      mockFs({
        [cniDir]: {
          [`nerdctl-${networkName}.conflist`]: JSON.stringify({
            cniVersion: '1.0.0',
            name: networkName,
            plugins: validPlugins,
          }),
        },
      });

      const adapter = new ContainerdProxyAdapter({});
      const result = adapter.ensureAppProxyNetwork(networkName, {
        cniNetconfPath: cniDir,
      });

      expect(result).to.equal(false);
    });
  });
});

describe('app-add-proxy-2-landonet hook (containerd compat)', () => {
  let hook;
  // Pre-require modules that use fs so mock-fs doesn't intercept their loading
  const bluebird = require('bluebird');

  before(() => {
    // Pre-require the hook (and its transitive deps) before any mock-fs calls
    hook = require('../hooks/app-add-proxy-2-landonet');
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should not bail early for containerd backend', async () => {
    // The hook should attempt to find the proxy container even with containerd.
    // It will bail because the container doesn't exist, but it should NOT
    // return immediately due to engineBackend === 'containerd'.
    //
    // Mock the CNI directory so ensureCniNetwork() can write conflist files
    // without requiring real root-owned /etc/lando/cni/finch permissions.
    mockFs({'/etc/lando/cni/finch': {}});

    const mockApp = {
      config: {proxy: []},
      log: {debug: sinon.spy()},
    };
    const existsSpy = sinon.stub().resolves(false);
    const mockLando = {
      config: {
        proxy: 'ON',
        networkBridge: 'lando_bridgenet_test',
        proxyContainer: 'test-proxy-container',
      },
      engine: {
        engineBackend: 'containerd',
        getNetwork: sinon.stub().returns({
          disconnect: sinon.stub().resolves(),
          connect: sinon.stub().resolves(),
        }),
        exists: existsSpy,
      },
      log: {debug: sinon.spy()},
      Promise: bluebird,
    };

    await hook(mockApp, mockLando);

    // The key assertion: engine.exists was called, meaning we did NOT bail
    // early due to containerd backend check
    expect(existsSpy.calledOnce).to.equal(true);
    expect(existsSpy.calledWith({id: 'test-proxy-container'})).to.equal(true);
  });

  it('should still bail if proxy is not ON', async () => {
    const mockApp = {config: {proxy: []}};
    const existsSpy = sinon.stub().resolves(false);
    const mockLando = {
      config: {proxy: 'OFF'},
      engine: {
        engineBackend: 'containerd',
        exists: existsSpy,
      },
    };

    await hook(mockApp, mockLando);

    // engine.exists should NOT have been called — bailed because proxy is OFF
    expect(existsSpy.called).to.equal(false);
  });
});
