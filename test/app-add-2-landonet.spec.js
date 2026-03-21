'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const Promise = require('./../lib/promise');

const hook = require('./../hooks/app-add-2-landonet');

describe('app-add-2-landonet', () => {
  it('should reconnect app containers to landonet with internal aliases', async () => {
    const disconnect = sinon.stub().rejects(new Error('is not connected to network'));
    const connect = sinon.stub().resolves();
    const app = {
      project: 'docscore',
      log: {debug: sinon.stub()},
    };
    const lando = {
      config: {networkBridge: 'lando_bridge_network'},
      engine: {
        getNetwork: () => ({disconnect, connect}),
        list: sinon.stub().returns(Promise.resolve([{id: 'cid-1', service: 'cli', app: 'docscore', name: 'docscore-cli-1'}])),
        docker: {dockerode: {listContainers: sinon.stub().resolves([])}},
      },
    };

    await hook(app, lando);

    expect(disconnect.calledOnce).to.equal(true);
    expect(disconnect.firstCall.args[0]).to.deep.equal({Container: 'cid-1', Force: true});
    expect(connect.calledOnce).to.equal(true);
    expect(connect.firstCall.args[0]).to.deep.equal({
      Container: 'cid-1',
      EndpointConfig: {Aliases: ['cli.docscore.internal']},
    });
  });

  it('should update container hosts files for containerd backends', async () => {
    const shell = {sh: sinon.stub().resolves()};
    const app = {
      project: 'docscore',
      services: ['cli'],
      containers: {cli: 'docscore_cli_1'},
      log: {debug: sinon.stub()},
    };
    const lando = {
      Promise,
      config: {
        networkBridge: 'lando_bridge_network',
        proxy: 'ON',
        proxyContainer: 'landoproxyhyperion5000gandalfedition_proxy_1',
        proxyNet: 'landoproxyhyperion5000gandalfedition_edge',
        userConfRoot: '/tmp/.lando-test',
      },
      engine: {
        engineBackend: 'containerd',
        exists: sinon.stub().resolves(true),
        scan: sinon.stub()
          .onFirstCall().resolves({
            Name: '/docscore-cli-1',
            Config: {Labels: {'nerdctl/networks': JSON.stringify(['lando_bridge_network', 'docscore_default'])}},
            NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.0.0.5'}}},
          })
          .onSecondCall().resolves({Name: '/landoproxyhyperion5000gandalfedition-proxy-1'}),
      },
      shell,
    };

    await hook(app, lando);

    expect(shell.sh.calledTwice).to.equal(true);
    expect(shell.sh.firstCall.args[0].join(' ')).to.include('exec --user root docscore-cli-1');
    expect(shell.sh.firstCall.args[0].join(' ')).to.include('10.0.0.5 cli.docscore.internal');
    expect(shell.sh.secondCall.args[0].join(' ')).to.include('exec --user root landoproxyhyperion5000gandalfedition-proxy-1');
  });
});
