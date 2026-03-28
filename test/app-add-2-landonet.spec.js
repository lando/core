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

  describe('multi-container containerd orchestration', () => {
    /**
     * Helper to create a mock exec chain for a single container target.
     *
     * Returns independent stream/exec/container mocks so that multiple
     * containers can be stubbed without interference.
     *
     * @return {{stream: EventEmitter, exec: Object, container: Object}}
     */
    const createMockExecChain = () => {
      const stream = new EventEmitter();
      const exec = {
        start: sinon.stub().callsFake(() => {
          setTimeout(() => stream.emit('end'), 5);
          return Promise.resolve(stream);
        }),
        inspect: sinon.stub().resolves({ExitCode: 0}),
      };
      const container = {
        exec: sinon.stub().resolves(exec),
      };
      return {stream, exec, container};
    };

    it('should inject ALL aliases into ALL containers for multi-service apps', async () => {
      const webMock = createMockExecChain();
      const dbMock = createMockExecChain();

      // Configure withArgs on separate lines to avoid sinon chaining pitfall:
      // chained .withArgs().returns().withArgs() operates on the behavior object,
      // not the original stub, which can cause the first arg's return value
      // to be overwritten by the second.
      const getContainerStub = sinon.stub();
      getContainerStub.withArgs('myapp-web-1').returns(webMock.container);
      getContainerStub.withArgs('myapp-db-1').returns(dbMock.container);
      const mockDockerode = {getContainer: getContainerStub};

      const app = {
        project: 'myapp',
        services: ['web', 'db'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub()
            .onFirstCall().resolves({
              Name: '/myapp-web-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.2'}}},
            })
            .onSecondCall().resolves({
              Name: '/myapp-db-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.3'}}},
            }),
        },
      };

      await hook(app, lando);

      // Both containers should be targeted
      expect(mockDockerode.getContainer.calledTwice).to.equal(true);
      expect(mockDockerode.getContainer.firstCall.args[0]).to.equal('myapp-web-1');
      expect(mockDockerode.getContainer.secondCall.args[0]).to.equal('myapp-db-1');

      // Both containers should get exec'd with ALL aliases (web + db)
      expect(webMock.container.exec.calledOnce).to.equal(true);
      expect(dbMock.container.exec.calledOnce).to.equal(true);

      // Verify the web container's hosts script contains BOTH aliases
      const webScript = webMock.container.exec.firstCall.args[0].Cmd[2];
      expect(webScript).to.include('10.4.0.2 web.myapp.internal');
      expect(webScript).to.include('10.4.0.3 db.myapp.internal');

      // Verify the db container's hosts script also contains BOTH aliases
      const dbScript = dbMock.container.exec.firstCall.args[0].Cmd[2];
      expect(dbScript).to.include('10.4.0.2 web.myapp.internal');
      expect(dbScript).to.include('10.4.0.3 db.myapp.internal');
    });

    it('should handle three or more services with unique IPs and aliases', async () => {
      const webMock = createMockExecChain();
      const dbMock = createMockExecChain();
      const cacheMock = createMockExecChain();

      const getContainerStub = sinon.stub();
      getContainerStub.withArgs('proj-web-1').returns(webMock.container);
      getContainerStub.withArgs('proj-db-1').returns(dbMock.container);
      getContainerStub.withArgs('proj-cache-1').returns(cacheMock.container);
      const mockDockerode = {getContainer: getContainerStub};

      const app = {
        project: 'proj',
        services: ['web', 'db', 'cache'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub()
            .onCall(0).resolves({
              Name: '/proj-web-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['proj_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.2'}}},
            })
            .onCall(1).resolves({
              Name: '/proj-db-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['proj_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.3'}}},
            })
            .onCall(2).resolves({
              Name: '/proj-cache-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['proj_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.4'}}},
            }),
        },
      };

      await hook(app, lando);

      // All 3 containers should be targeted
      expect(mockDockerode.getContainer.calledThrice).to.equal(true);

      // Each container should receive ALL 3 aliases
      for (const mock of [webMock, dbMock, cacheMock]) {
        const script = mock.container.exec.firstCall.args[0].Cmd[2];
        expect(script).to.include('10.4.0.2 web.proj.internal');
        expect(script).to.include('10.4.0.3 db.proj.internal');
        expect(script).to.include('10.4.0.4 cache.proj.internal');
      }
    });

    it('should continue with remaining services when one scan fails', async () => {
      const dbMock = createMockExecChain();

      const mockDockerode = {
        getContainer: sinon.stub()
          .withArgs('myapp-db-1').returns(dbMock.container),
      };

      const app = {
        project: 'myapp',
        services: ['web', 'db'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub()
            // web scan fails
            .onFirstCall().rejects(new Error('container not found'))
            // db scan succeeds
            .onSecondCall().resolves({
              Name: '/myapp-db-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.3'}}},
            }),
        },
      };

      await hook(app, lando);

      // Only db container should be targeted (web scan failed)
      expect(mockDockerode.getContainer.calledOnce).to.equal(true);
      expect(mockDockerode.getContainer.firstCall.args[0]).to.equal('myapp-db-1');

      // db should still get its alias
      const dbScript = dbMock.container.exec.firstCall.args[0].Cmd[2];
      expect(dbScript).to.include('10.4.0.3 db.myapp.internal');
      // web alias should NOT be present since scan failed
      expect(dbScript).to.not.include('web.myapp.internal');
    });

    it('should add container to targets but skip alias when IP is not found', async () => {
      const webMock = createMockExecChain();
      const dbMock = createMockExecChain();

      const getContainerStub = sinon.stub();
      getContainerStub.withArgs('myapp-web-1').returns(webMock.container);
      getContainerStub.withArgs('myapp-db-1').returns(dbMock.container);
      const mockDockerode = {getContainer: getContainerStub};

      const app = {
        project: 'myapp',
        services: ['web', 'db'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub()
            .onFirstCall().resolves({
              Name: '/myapp-web-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.2'}}},
            })
            // db has no IP on any preferred network
            .onSecondCall().resolves({
              Name: '/myapp-db-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['some_other_network'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '172.20.0.5'}}},
            }),
        },
      };

      await hook(app, lando);

      // Both containers should be targeted (db is scanned successfully)
      expect(mockDockerode.getContainer.calledTwice).to.equal(true);

      // Both should get hosts updated, but only web's alias is in the script
      const webScript = webMock.container.exec.firstCall.args[0].Cmd[2];
      expect(webScript).to.include('10.4.0.2 web.myapp.internal');
      expect(webScript).to.not.include('db.myapp.internal');

      const dbScript = dbMock.container.exec.firstCall.args[0].Cmd[2];
      expect(dbScript).to.include('10.4.0.2 web.myapp.internal');
      expect(dbScript).to.not.include('db.myapp.internal');
    });

    it('should return early when no services have resolvable IPs', async () => {
      const mockDockerode = {
        getContainer: sinon.stub(),
      };

      const app = {
        project: 'myapp',
        services: ['web', 'db'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub()
            // Both services have no IP on preferred networks
            .onFirstCall().resolves({
              Name: '/myapp-web-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['alien_net'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '192.168.1.5'}}},
            })
            .onSecondCall().resolves({
              Name: '/myapp-db-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['alien_net'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '192.168.1.6'}}},
            }),
        },
      };

      await hook(app, lando);

      // updateHosts should NOT be called since no aliases were collected
      expect(mockDockerode.getContainer.called).to.equal(false);
    });

    it('should return early when app has no services', async () => {
      const mockDockerode = {
        getContainer: sinon.stub(),
      };

      const app = {
        project: 'myapp',
        services: [],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub(),
        },
      };

      await hook(app, lando);

      expect(lando.engine.scan.called).to.equal(false);
      expect(mockDockerode.getContainer.called).to.equal(false);
    });

    it('should use container name from app.containers map when available', async () => {
      const webMock = createMockExecChain();
      const dbMock = createMockExecChain();

      const getContainerStub = sinon.stub();
      getContainerStub.withArgs('myapp_web_1').returns(webMock.container);
      getContainerStub.withArgs('custom-db-name').returns(dbMock.container);
      const mockDockerode = {getContainer: getContainerStub};

      const app = {
        project: 'myapp',
        services: ['web', 'db'],
        // Explicit container name mapping (e.g. from Docker Compose v1 naming)
        containers: {web: 'myapp_web_1', db: 'custom-db-name'},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub()
            .onFirstCall().resolves({
              Name: '/myapp_web_1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.2'}}},
            })
            .onSecondCall().resolves({
              Name: '/custom-db-name',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.3'}}},
            }),
        },
      };

      await hook(app, lando);

      // scan should be called with the container names from the map
      expect(lando.engine.scan.firstCall.args[0]).to.deep.equal({id: 'myapp_web_1'});
      expect(lando.engine.scan.secondCall.args[0]).to.deep.equal({id: 'custom-db-name'});

      // Both containers should get ALL aliases
      const webScript = webMock.container.exec.firstCall.args[0].Cmd[2];
      expect(webScript).to.include('10.4.0.2 web.myapp.internal');
      expect(webScript).to.include('10.4.0.3 db.myapp.internal');
    });

    it('should resolve IP from project_default when bridge network is not configured', async () => {
      // In containerd, containers are NOT connected to lando_bridge_network
      // via Docker API — the IP comes from ${project}_default instead.
      const webMock = createMockExecChain();

      const mockDockerode = {
        getContainer: sinon.stub().returns(webMock.container),
      };

      const app = {
        project: 'myapp',
        services: ['web'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub().resolves({
            Name: '/myapp-web-1',
            // Only on project_default, NOT on lando_bridge_network
            Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
            NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.2'}}},
          }),
        },
      };

      await hook(app, lando);

      // Should still find IP via myapp_default (second preference)
      const script = webMock.container.exec.firstCall.args[0].Cmd[2];
      expect(script).to.include('10.4.0.2 web.myapp.internal');
    });

    it('should handle multi-network containers by picking the correct ethN index', async () => {
      // When a container is on multiple networks, the nerdctl/networks label
      // lists them in order, and ethN interfaces correspond to that order.
      const webMock = createMockExecChain();

      const mockDockerode = {
        getContainer: sinon.stub().returns(webMock.container),
      };

      const app = {
        project: 'myapp',
        services: ['web'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub().resolves({
            Name: '/myapp-web-1',
            // project_default is at index 1, not 0
            Config: {Labels: {'nerdctl/networks': JSON.stringify(['some_custom_net', 'myapp_default'])}},
            NetworkSettings: {
              Networks: {
                'unknown-eth0': {IPAddress: '172.20.0.5'},
                'unknown-eth1': {IPAddress: '10.4.0.2'},
              },
            },
          }),
        },
      };

      await hook(app, lando);

      // Should pick the IP from unknown-eth1 (index 1 = myapp_default)
      const script = webMock.container.exec.firstCall.args[0].Cmd[2];
      expect(script).to.include('10.4.0.2 web.myapp.internal');
      // Should NOT use the IP from the custom network
      expect(script).to.not.include('172.20.0.5');
    });

    it('should include proxy container as target but not as alias source', async () => {
      const webMock = createMockExecChain();
      const dbMock = createMockExecChain();
      const proxyMock = createMockExecChain();

      const getContainerStub = sinon.stub();
      getContainerStub.withArgs('myapp-web-1').returns(webMock.container);
      getContainerStub.withArgs('myapp-db-1').returns(dbMock.container);
      getContainerStub.withArgs('landoproxy-proxy-1').returns(proxyMock.container);
      const mockDockerode = {getContainer: getContainerStub};

      const app = {
        project: 'myapp',
        services: ['web', 'db'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'ON',
          proxyContainer: 'landoproxy_proxy_1',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          exists: sinon.stub().resolves(true),
          scan: sinon.stub()
            .onCall(0).resolves({
              Name: '/myapp-web-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.2'}}},
            })
            .onCall(1).resolves({
              Name: '/myapp-db-1',
              Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
              NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.3'}}},
            })
            // Proxy container scan (third call)
            .onCall(2).resolves({Name: '/landoproxy-proxy-1'}),
        },
      };

      await hook(app, lando);

      // All 3 containers (web, db, proxy) should get hosts updates
      expect(mockDockerode.getContainer.calledThrice).to.equal(true);
      expect(mockDockerode.getContainer.getCall(0).args[0]).to.equal('myapp-web-1');
      expect(mockDockerode.getContainer.getCall(1).args[0]).to.equal('myapp-db-1');
      expect(mockDockerode.getContainer.getCall(2).args[0]).to.equal('landoproxy-proxy-1');

      // Proxy container should get the app aliases but should NOT contribute its own alias
      const proxyScript = proxyMock.container.exec.firstCall.args[0].Cmd[2];
      expect(proxyScript).to.include('10.4.0.2 web.myapp.internal');
      expect(proxyScript).to.include('10.4.0.3 db.myapp.internal');
    });

    it('should sanitize IPs and aliases to prevent injection in hosts entries', async () => {
      const webMock = createMockExecChain();

      const mockDockerode = {
        getContainer: sinon.stub().returns(webMock.container),
      };

      const app = {
        project: 'myapp',
        services: ['web'],
        containers: {},
        log: {debug: sinon.stub()},
      };
      const lando = {
        Promise,
        config: {
          networkBridge: 'lando_bridge_network',
          proxy: 'OFF',
          proxyNet: 'landoproxy_edge',
        },
        engine: {
          engineBackend: 'containerd',
          docker: {dockerode: mockDockerode},
          scan: sinon.stub().resolves({
            Name: '/myapp-web-1',
            Config: {Labels: {'nerdctl/networks': JSON.stringify(['myapp_default'])}},
            NetworkSettings: {Networks: {'unknown-eth0': {IPAddress: '10.4.0.2'}}},
          }),
        },
      };

      await hook(app, lando);

      // The hosts echo line should contain properly sanitized IP and alias.
      // The script skeleton uses $(mktemp) and "$tmp" which are expected shell
      // constructs. We only verify that the user-data portion (the echo line
      // with IP + alias) contains no shell metacharacters.
      const script = webMock.container.exec.firstCall.args[0].Cmd[2];
      // Extract the echo lines from the script (the user-data portion)
      const echoMatch = script.match(/echo '([^']+)'/g);
      expect(echoMatch).to.be.an('array').that.is.not.empty;
      for (const line of echoMatch) {
        // Each echo line should only contain safe characters: digits, dots,
        // colons, alphanumerics, hyphens, underscores, spaces, and the hash
        expect(line).to.match(/^echo '[0-9.:]+\s+[a-zA-Z0-9.\-_]+\s+#\s+lando-internal-aliases'$/);
      }
    });
  });
});
