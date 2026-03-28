/*
 * Integration tests for the containerd compose start path.
 *
 * Tests the production compose closure created by
 * BackendManager._createContainerdEngine() — the critical glue between
 * docker-compose, CNI network bridging, and finch-daemon.
 *
 * This covers:
 * - DOCKER_HOST / DOCKER_BUILDKIT / BUILDKIT_HOST env injection
 * - ensureComposeCniNetworks() called only on 'start'
 * - Correct shell.sh() invocation (binary + command array + options)
 * - Full engine.start() → router.eventWrapper → compose('start', datum) flow
 * - Bluebird Proxy wrapping on ContainerdContainer methods
 * - Multiple compose commands (stop, remove, build, logs, etc.)
 *
 * All tests are stub-based and always run — no real containerd required.
 *
 * @file containerd-compose-start.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const sinon = require('sinon');
const fs = require('fs');
const mockFs = require('mock-fs');

const BackendManager = require('./../lib/backend-manager');
const BluebirdPromise = require('./../lib/promise');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal stub config for BackendManager with containerd engine.
 * @param {Object} [overrides] - Config overrides.
 * @return {Object} Stub config.
 */
const stubConfig = (overrides = {}) => ({
  engine: 'containerd',
  orchestratorBin: '/usr/bin/docker-compose',
  orchestratorVersion: '2.31.0',
  containerdSystemBinDir: '/usr/local/lib/lando/bin',
  containerdBin: '/usr/local/lib/lando/bin/containerd',
  nerdctlBin: '/tmp/.lando-test/bin/nerdctl',
  buildkitdBin: '/usr/local/lib/lando/bin/buildkitd',
  containerdSocket: '/run/lando/containerd.sock',
  buildkitSocket: '/run/lando/buildkitd.sock',
  dockerBin: '/usr/bin/docker',
  engineConfig: {},
  process: 'node',
  userConfRoot: '/tmp/.lando-test',
  ...overrides,
});

/**
 * Minimal stub dependencies for BackendManager.
 * Returns an object with cache, events, log, shell stubs.
 * The shell.sh stub resolves with an empty string by default.
 * events.emit returns Bluebird promises — required because
 * router.eventWrapper chains .tap() which is Bluebird-only.
 * @return {{cache: Object, events: Object, log: Object, shell: Object}}
 */
const stubDeps = () => ({
  cache: {get: sinon.stub().returns(undefined), set: sinon.stub()},
  events: {on: sinon.stub(), emit: sinon.stub().callsFake(() => BluebirdPromise.resolve())},
  log: {
    debug: sinon.stub(),
    verbose: sinon.stub(),
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    silly: sinon.stub(),
  },
  shell: {sh: sinon.stub().resolves('')},
});

/**
 * Create a BackendManager and extract the engine's compose closure.
 * Also returns the shell stub so callers can inspect shell.sh() calls.
 * @param {Object} [configOverrides] - Config overrides.
 * @return {{engine: Object, compose: Function, shell: Object, deps: Object}}
 */
const createContainerdEngine = (configOverrides = {}) => {
  const config = stubConfig(configOverrides);
  const deps = stubDeps();
  const manager = new BackendManager(config, deps.cache, deps.events, deps.log, deps.shell);
  const engine = manager.createEngine('test-id');

  return {engine, compose: engine.compose, shell: deps.shell, deps};
};

// ============================================================================
// 1. Compose closure — environment variable injection
// ============================================================================
describe('containerd compose start: env injection', () => {
  it('should inject DOCKER_HOST pointing at finch-daemon socket', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    sinon.assert.calledOnce(shell.sh);
    const [, opts] = shell.sh.firstCall.args;
    expect(opts.env).to.have.property('DOCKER_HOST');
    expect(opts.env.DOCKER_HOST).to.match(/^unix:\/\/.*finch\.sock$/);
  });

  it('should inject DOCKER_BUILDKIT=1', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    expect(opts.env).to.have.property('DOCKER_BUILDKIT', '1');
  });

  it('should inject BUILDKIT_HOST pointing at buildkitd socket', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    expect(opts.env).to.have.property('BUILDKIT_HOST');
    expect(opts.env.BUILDKIT_HOST).to.match(/^unix:\/\/.*buildkitd\.sock$/);
  });

  it('should use the configured finch socket path in DOCKER_HOST', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    // The finch socket is derived from the daemon's finchDaemon.getSocketPath()
    // Default path is /run/lando/finch.sock
    expect(opts.env.DOCKER_HOST).to.include('/run/lando/finch.sock');
  });

  it('should use the configured buildkit socket path in BUILDKIT_HOST', async () => {
    const {compose, shell} = createContainerdEngine({
      buildkitSocket: '/custom/buildkitd.sock',
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    expect(opts.env.BUILDKIT_HOST).to.equal('unix:///custom/buildkitd.sock');
  });

  it('should preserve process.env in the compose environment', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    // process.env.PATH should be carried through
    expect(opts.env).to.have.property('PATH');
  });

  it('should not forward datum.opts.env (compose.js does not pass env through)', async () => {
    // compose.js's buildShell() returns {cmd, opts: {mode, cstdio, silent}}
    // — no env property. So datum.opts.env is NOT carried through to shell.sh().
    // The only env vars in the shell opts come from process.env and the
    // containerd-specific overrides (DOCKER_HOST, DOCKER_BUILDKIT, BUILDKIT_HOST).
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {env: {MY_CUSTOM_VAR: 'custom_value'}},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    // datum.opts.env is NOT forwarded — compose.js doesn't pass it through
    expect(opts.env).to.not.have.property('MY_CUSTOM_VAR');
  });

  it('should always set DOCKER_HOST to finch socket regardless of process.env', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    // The containerd compose closure always sets DOCKER_HOST to finch socket,
    // which comes AFTER ...process.env in the spread, so it overrides any
    // DOCKER_HOST that might be in process.env
    expect(opts.env.DOCKER_HOST).to.match(/^unix:\/\/.*finch\.sock$/);
  });

  it('should inject env vars for non-start commands too', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('stop', datum);

    const [, opts] = shell.sh.firstCall.args;
    expect(opts.env).to.have.property('DOCKER_HOST');
    expect(opts.env.DOCKER_HOST).to.match(/^unix:\/\/.*finch\.sock$/);
    expect(opts.env).to.have.property('DOCKER_BUILDKIT', '1');
    expect(opts.env).to.have.property('BUILDKIT_HOST');
  });
});

// ============================================================================
// 2. Compose closure — shell.sh() invocation
// ============================================================================
describe('containerd compose start: shell execution', () => {
  it('should call shell.sh() with the orchestrator binary as first arg', async () => {
    const {compose, shell} = createContainerdEngine({
      orchestratorBin: '/custom/docker-compose',
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    sinon.assert.calledOnce(shell.sh);
    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray[0]).to.equal('/custom/docker-compose');
  });

  it('should include --project-name in the command array', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'myproject',
      opts: {},
    };

    await compose('start', datum);

    const [cmdArray] = shell.sh.firstCall.args;
    const projectIdx = cmdArray.indexOf('--project-name');
    expect(projectIdx).to.be.greaterThan(0);
    expect(cmdArray[projectIdx + 1]).to.equal('myproject');
  });

  it('should include --file with the compose file path', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/path/to/my-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [cmdArray] = shell.sh.firstCall.args;
    const fileIdx = cmdArray.indexOf('--file');
    expect(fileIdx).to.be.greaterThan(0);
    expect(cmdArray[fileIdx + 1]).to.equal('/path/to/my-compose.yml');
  });

  it('should include "up" sub-command for start', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('up');
  });

  it('should include --detach flag by default for start', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('--detach');
  });

  it('should include --remove-orphans flag by default for start', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('--remove-orphans');
  });

  it('should pass mode: spawn in opts', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [, opts] = shell.sh.firstCall.args;
    expect(opts.mode).to.equal('spawn');
  });

  it('should handle multiple compose files', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml', '/tmp/docker-compose.override.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const [cmdArray] = shell.sh.firstCall.args;
    // Should have two --file flags
    const fileIndices = cmdArray.reduce((acc, val, idx) => {
      if (val === '--file') acc.push(idx);
      return acc;
    }, []);
    expect(fileIndices).to.have.lengthOf(2);
    expect(cmdArray[fileIndices[0] + 1]).to.equal('/tmp/docker-compose.yml');
    expect(cmdArray[fileIndices[1] + 1]).to.equal('/tmp/docker-compose.override.yml');
  });
});

// ============================================================================
// 3. Compose closure — CNI network bridging
// ============================================================================
describe('containerd compose start: CNI network bridging', () => {
  let ensureCniStub;

  afterEach(() => {
    if (ensureCniStub) ensureCniStub.restore();
    mockFs.restore();
  });

  it('should call ensureComposeCniNetworks on "start" command', async () => {
    const {compose, shell} = createContainerdEngine();

    // Create a mock compose file with a network definition.
    // ensureCniNetwork writes to /etc/lando/cni/finch/ with names like
    // nerdctl-<networkname>.conflist
    mockFs({
      '/tmp/docker-compose.yml': `
services:
  web:
    image: nginx:alpine
networks:
  frontend:
    driver: bridge
`,
      '/etc/lando/cni/finch': {},
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    // Verify shell.sh was called (compose command executed)
    sinon.assert.calledOnce(shell.sh);

    // Verify CNI conflist files were created
    // ensureComposeCniNetworks creates configs for testapp_default and testapp_frontend
    const cniDir = '/etc/lando/cni/finch';
    const files = fs.readdirSync(cniDir);
    expect(files).to.include('nerdctl-testapp_default.conflist');
    expect(files).to.include('nerdctl-testapp_frontend.conflist');
  });

  it('should NOT call ensureComposeCniNetworks on "stop" command', async () => {
    const {compose, shell: shStub} = createContainerdEngine();

    // Create a mock compose file — CNI should NOT be created for stop
    mockFs({
      '/tmp/docker-compose.yml': `
services:
  web:
    image: nginx:alpine
networks:
  mynet:
    driver: bridge
`,
      '/etc/lando/cni/finch': {},
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('stop', datum);

    // shell.sh should still be called (compose stop executes)
    sinon.assert.calledOnce(shStub.sh);

    // But no CNI files should be created for stop
    const cniDir = '/etc/lando/cni/finch';
    const files = fs.readdirSync(cniDir);
    expect(files).to.have.lengthOf(0);
  });

  it('should NOT call ensureComposeCniNetworks on "remove" command', async () => {
    const {compose, shell: shStub} = createContainerdEngine();

    mockFs({
      '/tmp/docker-compose.yml': `
services:
  web:
    image: nginx:alpine
`,
      '/etc/lando/cni/finch': {},
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {purge: true},
    };

    await compose('remove', datum);

    sinon.assert.calledOnce(shStub.sh);

    const cniDir = '/etc/lando/cni/finch';
    const files = fs.readdirSync(cniDir);
    expect(files).to.have.lengthOf(0);
  });

  it('should create CNI configs for _default and custom networks on start', async () => {
    const {compose} = createContainerdEngine();

    mockFs({
      '/tmp/docker-compose.yml': `
services:
  web:
    image: nginx:alpine
  api:
    image: node:18
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
`,
      '/etc/lando/cni/finch': {},
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'myapp',
      opts: {},
    };

    await compose('start', datum);

    const cniDir = '/etc/lando/cni/finch';
    const files = fs.readdirSync(cniDir);

    // Should have: myapp_default, myapp_frontend, myapp_backend
    expect(files).to.include('nerdctl-myapp_default.conflist');
    expect(files).to.include('nerdctl-myapp_frontend.conflist');
    expect(files).to.include('nerdctl-myapp_backend.conflist');
  });

  it('should skip external networks when creating CNI configs', async () => {
    const {compose} = createContainerdEngine();

    mockFs({
      '/tmp/docker-compose.yml': `
services:
  web:
    image: nginx:alpine
networks:
  internal:
    driver: bridge
  external_net:
    external: true
`,
      '/etc/lando/cni/finch': {},
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('start', datum);

    const cniDir = '/etc/lando/cni/finch';
    const files = fs.readdirSync(cniDir);

    expect(files).to.include('nerdctl-testapp_default.conflist');
    expect(files).to.include('nerdctl-testapp_internal.conflist');
    // External network should NOT have a conflist
    expect(files).to.not.include('nerdctl-testapp_external_net.conflist');
    expect(files).to.not.include('nerdctl-external_net.conflist');
  });
});

// ============================================================================
// 4. Compose closure — all compose commands
// ============================================================================
describe('containerd compose start: all compose commands', () => {
  it('should generate "stop" sub-command for stop', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('stop', datum);

    sinon.assert.calledOnce(shell.sh);
    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('stop');
  });

  it('should generate "down" sub-command for remove with purge', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {purge: true},
    };

    await compose('remove', datum);

    sinon.assert.calledOnce(shell.sh);
    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('down');
  });

  it('should generate "rm" sub-command for remove without purge', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {purge: false},
    };

    await compose('remove', datum);

    sinon.assert.calledOnce(shell.sh);
    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('rm');
  });

  it('should generate "logs" sub-command for logs', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('logs', datum);

    sinon.assert.calledOnce(shell.sh);
    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('logs');
  });

  it('should generate "ps" sub-command for getId', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('getId', datum);

    sinon.assert.calledOnce(shell.sh);
    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('ps');
  });

  it('should generate "kill" sub-command for kill', async () => {
    const {compose, shell} = createContainerdEngine();

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await compose('kill', datum);

    sinon.assert.calledOnce(shell.sh);
    const [cmdArray] = shell.sh.firstCall.args;
    expect(cmdArray).to.include('kill');
  });

  it('should inject DOCKER_HOST for every compose command type', async () => {
    const commands = ['start', 'stop', 'remove', 'logs', 'getId', 'kill'];

    for (const cmd of commands) {
      const {compose, shell} = createContainerdEngine();

      const datum = {
        compose: ['/tmp/docker-compose.yml'],
        project: 'testapp',
        opts: cmd === 'remove' ? {purge: true} : {},
      };

      await compose(cmd, datum);

      sinon.assert.calledOnce(shell.sh);
      const [, opts] = shell.sh.firstCall.args;
      expect(opts.env.DOCKER_HOST).to.match(/^unix:\/\/.*finch\.sock$/,
        `DOCKER_HOST should be set for "${cmd}" command`);
    }
  });
});

// ============================================================================
// 5. Bluebird Proxy wrapping on ContainerdContainer
// ============================================================================
describe('containerd compose start: Bluebird Proxy wrapping', () => {
  it('should wrap ContainerdContainer methods to return Bluebird promises', () => {
    const {engine} = createContainerdEngine();
    const Promise = require('./../lib/promise');

    // engine.docker is a Proxy wrapping ContainerdContainer
    // Calling list() should return a Bluebird promise (has .each, .tap, .map)
    const result = engine.docker.list();
    expect(result).to.be.an.instanceOf(Promise);
    expect(result.each).to.be.a('function');
    expect(result.tap).to.be.a('function');
    expect(result.map).to.be.a('function');
  });

  it('should preserve non-function properties on the proxy', () => {
    const {engine} = createContainerdEngine();

    // ContainerdContainer has an 'id' property set in constructor
    expect(engine.docker.id).to.equal('test-id');
  });
});

// ============================================================================
// 6. Full engine.start() → router.eventWrapper → compose flow
// ============================================================================
describe('containerd compose start: full engine.start() flow', () => {
  it('should call daemon.up() before compose start', async () => {
    const {engine, deps} = createContainerdEngine();

    // Stub daemon.up() to track call order
    const callOrder = [];
    sinon.stub(engine.daemon, 'up').callsFake(() => {
      callOrder.push('daemon.up');
      return BluebirdPromise.resolve();
    });

    // The shell.sh stub records when compose is called
    deps.shell.sh.callsFake(() => {
      callOrder.push('compose');
      return Promise.resolve('');
    });

    const data = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await engine.start(data);

    expect(callOrder).to.include('daemon.up');
    expect(callOrder).to.include('compose');
    expect(callOrder.indexOf('daemon.up')).to.be.lessThan(callOrder.indexOf('compose'));

    engine.daemon.up.restore();
  });

  it('should emit pre-engine-start and post-engine-start events', async () => {
    const {engine, deps} = createContainerdEngine();

    // Stub daemon.up() so it doesn't actually try to start containerd
    sinon.stub(engine.daemon, 'up').callsFake(() => BluebirdPromise.resolve());

    const data = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await engine.start(data);

    // events.emit is called for various lifecycle events
    const emitCalls = deps.events.emit.getCalls().map(c => c.args[0]);
    expect(emitCalls).to.include('pre-engine-autostart');
    expect(emitCalls).to.include('engine-autostart');
    expect(emitCalls).to.include('pre-engine-start');
    expect(emitCalls).to.include('post-engine-start');

    engine.daemon.up.restore();
  });

  it('should pass data through to compose for a single datum', async () => {
    const {engine, deps} = createContainerdEngine();

    sinon.stub(engine.daemon, 'up').callsFake(() => BluebirdPromise.resolve());

    const data = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'myproject',
      opts: {services: ['web']},
    };

    await engine.start(data);

    sinon.assert.calledOnce(deps.shell.sh);
    const [cmdArray] = deps.shell.sh.firstCall.args;

    // Should include the project name
    const projectIdx = cmdArray.indexOf('--project-name');
    expect(cmdArray[projectIdx + 1]).to.equal('myproject');

    // Should include 'up' for start
    expect(cmdArray).to.include('up');

    engine.daemon.up.restore();
  });

  it('should handle an array of data objects (multiple compose sets)', async () => {
    const {engine, deps} = createContainerdEngine();

    sinon.stub(engine.daemon, 'up').callsFake(() => BluebirdPromise.resolve());

    const data = [
      {
        compose: ['/tmp/compose-a.yml'],
        project: 'project-a',
        opts: {},
      },
      {
        compose: ['/tmp/compose-b.yml'],
        project: 'project-b',
        opts: {},
      },
    ];

    await engine.start(data);

    // shell.sh should be called twice — once per datum
    sinon.assert.calledTwice(deps.shell.sh);

    const [cmdA] = deps.shell.sh.firstCall.args;
    const [cmdB] = deps.shell.sh.secondCall.args;

    const projectIdxA = cmdA.indexOf('--project-name');
    expect(cmdA[projectIdxA + 1]).to.equal('project-a');

    const projectIdxB = cmdB.indexOf('--project-name');
    expect(cmdB[projectIdxB + 1]).to.equal('project-b');

    engine.daemon.up.restore();
  });

  it('should short-circuit when opts.services is an empty array', async () => {
    const {engine, deps} = createContainerdEngine();

    const data = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {services: []},
    };

    await engine.start(data);

    // Should NOT call shell.sh — engine.start returns early for empty services
    sinon.assert.notCalled(deps.shell.sh);
  });

  it('should return a thenable (Bluebird promise) from engine.start()', () => {
    const {engine} = createContainerdEngine();

    sinon.stub(engine.daemon, 'up').callsFake(() => BluebirdPromise.resolve());

    const data = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    const result = engine.start(data);
    // router.js uses Bluebird, so the return is a Bluebird promise
    expect(result).to.have.property('then').that.is.a('function');
    expect(result).to.be.an.instanceOf(BluebirdPromise);

    engine.daemon.up.restore();
  });
});

// ============================================================================
// 7. Compose closure vs Docker compose closure — structural parity
// ============================================================================
describe('containerd compose start: parity with Docker compose path', () => {
  it('should use the same compose.js command builder as Docker engine', async () => {
    // Both containerd and docker paths require('./compose') and call compose[cmd]()
    // Verify they produce the same command structure (minus env vars)
    const dockerConfig = {
      engine: 'docker',
      orchestratorBin: '/usr/bin/docker-compose',
      orchestratorVersion: '2.31.0',
      dockerBin: '/usr/bin/docker',
      engineConfig: {},
      process: 'node',
      userConfRoot: '/tmp/.lando-test',
    };

    const dockerDeps = stubDeps();
    const dockerManager = new BackendManager(dockerConfig, dockerDeps.cache, dockerDeps.events, dockerDeps.log, dockerDeps.shell);
    const dockerEngine = dockerManager.createEngine('test-id');

    const cdDeps = stubDeps();
    const cdConfig = stubConfig({orchestratorBin: '/usr/bin/docker-compose'});
    const cdManager = new BackendManager(
      cdConfig, cdDeps.cache, cdDeps.events, cdDeps.log, cdDeps.shell,
    );
    const containerdEngine = cdManager.createEngine('test-id');

    // Mock compose file — ensureComposeCniNetworks reads it on 'start'
    mockFs({
      '/tmp/docker-compose.yml': 'services:\n  web:\n    image: nginx:alpine\n',
      '/etc/lando/cni/finch': {},
    });

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    try {
      // Call start on both — await to surface any promise rejections
      await dockerEngine.compose('start', datum);
      await containerdEngine.compose('start', datum);

      // Both should have called shell.sh
      sinon.assert.calledOnce(dockerDeps.shell.sh);
      sinon.assert.calledOnce(cdDeps.shell.sh);

      const [dockerCmd] = dockerDeps.shell.sh.firstCall.args;
      const [containerdCmd] = cdDeps.shell.sh.firstCall.args;

      // Both should use the same orchestrator binary
      expect(dockerCmd[0]).to.equal(containerdCmd[0]);

      // Both should have the same compose sub-commands (project-name, file, up, etc.)
      // The command arrays should be identical since they use the same compose.js
      expect(dockerCmd).to.deep.equal(containerdCmd);
    } finally {
      mockFs.restore();
    }
  });

  it('should differ only in env vars between Docker and containerd compose', async () => {
    const dockerConfig = {
      engine: 'docker',
      orchestratorBin: '/usr/bin/docker-compose',
      orchestratorVersion: '2.31.0',
      dockerBin: '/usr/bin/docker',
      engineConfig: {},
      process: 'node',
      userConfRoot: '/tmp/.lando-test',
    };

    const dockerDeps = stubDeps();
    const dockerManager = new BackendManager(dockerConfig, dockerDeps.cache, dockerDeps.events, dockerDeps.log, dockerDeps.shell);
    const dockerEngine = dockerManager.createEngine('test-id');

    const cdDeps = stubDeps();
    const cdConfig = stubConfig({orchestratorBin: '/usr/bin/docker-compose'});
    const cdManager = new BackendManager(
      cdConfig, cdDeps.cache, cdDeps.events, cdDeps.log, cdDeps.shell,
    );
    const containerdEngine = cdManager.createEngine('test-id');

    const datum = {
      compose: ['/tmp/docker-compose.yml'],
      project: 'testapp',
      opts: {},
    };

    await dockerEngine.compose('stop', datum);
    await containerdEngine.compose('stop', datum);

    const [, dockerOpts] = dockerDeps.shell.sh.firstCall.args;
    const [, containerdOpts] = cdDeps.shell.sh.firstCall.args;

    // Docker path should NOT have DOCKER_HOST set to finch socket
    expect(dockerOpts.env).to.be.undefined;

    // Containerd path MUST have DOCKER_HOST, DOCKER_BUILDKIT, BUILDKIT_HOST
    expect(containerdOpts.env).to.have.property('DOCKER_HOST');
    expect(containerdOpts.env).to.have.property('DOCKER_BUILDKIT');
    expect(containerdOpts.env).to.have.property('BUILDKIT_HOST');
  });
});

// ============================================================================
// 8. Engine construction — binary path resolution
// ============================================================================
describe('containerd compose start: binary path resolution', () => {
  it('should use config.orchestratorBin when provided', () => {
    const {engine} = createContainerdEngine({
      orchestratorBin: '/opt/custom/docker-compose',
    });

    expect(engine.daemon.compose).to.equal('/opt/custom/docker-compose');
  });

  it('should fall back to userConfRoot/bin/docker-compose-v<version> when orchestratorBin not set', () => {
    const {engine} = createContainerdEngine({
      orchestratorBin: undefined,
      orchestratorVersion: '2.31.0',
      userConfRoot: '/home/testuser/.lando',
    });

    expect(engine.daemon.compose).to.equal('/home/testuser/.lando/bin/docker-compose-v2.31.0');
  });

  it('should set daemon.compose to the orchestrator binary path', () => {
    const {engine} = createContainerdEngine({
      orchestratorBin: '/usr/bin/docker-compose',
    });

    // Per BRIEF: daemon.compose is set so Engine.composeInstalled resolves correctly
    expect(engine.daemon.compose).to.equal('/usr/bin/docker-compose');
  });

  it('should set engineBackend to "containerd"', () => {
    const {engine} = createContainerdEngine();
    expect(engine.engineBackend).to.equal('containerd');
  });

  it('should set dockerInstalled based on containerd binary existence', () => {
    const {engine} = createContainerdEngine({
      containerdBin: '/definitely/does/not/exist/containerd',
    });

    // The containerd binary doesn't exist, so dockerInstalled should be false
    expect(engine.dockerInstalled).to.equal(false);
  });
});
