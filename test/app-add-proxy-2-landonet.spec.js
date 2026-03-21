'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const hook = require('./../hooks/app-add-proxy-2-landonet');

describe('app-add-proxy-2-landonet', () => {
  it('should use the scanned container id when reconnecting the proxy', async () => {
    const disconnect = sinon.stub().rejects(new Error('is not connected to network'));
    const connect = sinon.stub().resolves();
    const app = {
      config: {proxy: [{hostname: 'docs.core.lndo.site'}]},
      log: {debug: sinon.stub()},
    };
    const lando = {
      config: {proxy: 'ON', networkBridge: 'lando_bridge_network', proxyContainer: 'proxy_app_1'},
      engine: {
        getNetwork: () => ({disconnect, connect}),
        exists: sinon.stub().resolves(true),
        scan: sinon.stub().resolves({
          Id: 'abc123',
          NetworkSettings: {Networks: {lando_bridge_network: {Aliases: ['old.alias']}}},
        }),
      },
      Promise: Promise,
    };

    await hook(app, lando);

    expect(disconnect.calledOnce).to.equal(true);
    expect(disconnect.firstCall.args[0]).to.deep.equal({Container: 'abc123', Force: true});
    expect(connect.calledOnce).to.equal(true);
    expect(connect.firstCall.args[0].Container).to.equal('abc123');
    expect(connect.firstCall.args[0].EndpointConfig.Aliases).to.include('docs.core.lndo.site');
    expect(connect.firstCall.args[0].EndpointConfig.Aliases).to.include('old.alias');
  });
});
