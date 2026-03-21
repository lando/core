'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const {EventEmitter} = require('events');
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
    // Build a mock exec stream that emits 'end' after listeners are attached.
    // The hook awaits exec.start(), stores the stream, then wraps it in a
    // new Promise and attaches on('end'). We need to delay the 'end' event
    // until after all of that happens.
    const mockStream = new EventEmitter();

    const mockExec = {
      start: sinon.stub().callsFake(() => {
        // Use setTimeout(0) to fire after the microtask queue drains
        // (the hook's Promise constructor runs synchronously after await)
        setTimeout(() => mockStream.emit('end'), 5);
        return Promise.resolve(mockStream);
      }),
      inspect: sinon.stub().resolves({ExitCode: 0}),
    };

    const mockContainer = {
      exec: sinon.stub().resolves(mockExec),
    };

    const mockDockerode = {
      getContainer: sinon.stub().returns(mockContainer),
    };

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
        docker: {dockerode: mockDockerode},
        exists: sinon.stub().resolves(true),
        scan: sinon.stub()
          .onFirstCall().resolves({
            Name: '/docscore-cli-1',
            Config: {Labels: {'nerdctl/networks': JSON.stringify(['lando_bridge_network', 'docscore_default'])}},
            NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.0.0.5'}}},
          })
          .onSecondCall().resolves({Name: '/landoproxyhyperion5000gandalfedition-proxy-1'}),
      },
    };

    await hook(app, lando);

    // updateHosts should be called for each unique target
    // Targets: docscore-cli-1, landoproxyhyperion5000gandalfedition-proxy-1
    expect(mockDockerode.getContainer.calledTwice).to.equal(true);
    expect(mockDockerode.getContainer.firstCall.args[0]).to.equal('docscore-cli-1');
    expect(mockDockerode.getContainer.secondCall.args[0]).to.equal('landoproxyhyperion5000gandalfedition-proxy-1');

    // Each container should have exec called with root user and a hosts-update script
    expect(mockContainer.exec.calledTwice).to.equal(true);
    const execOpts = mockContainer.exec.firstCall.args[0];
    expect(execOpts.User).to.equal('root');
    expect(execOpts.Cmd[0]).to.equal('sh');
    expect(execOpts.Cmd[2]).to.include('10.0.0.5 cli.docscore.internal');
    expect(execOpts.Cmd[2]).to.include('lando-internal-aliases');
  });
});
