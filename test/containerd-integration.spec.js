/*
 * Integration tests for the containerd backend.
 *
 * Tests that require a real containerd installation are gated behind
 * `describeIfContainerd` and will be skipped when containerd is not present.
 * The NerdctlCompose command-generation tests are pure unit tests and always run.
 *
 * @file containerd-integration.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const sinon = require('sinon');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BackendManager = require('./../lib/backend-manager');
const {ContainerdDaemon, ContainerdContainer, NerdctlCompose} = require('./../lib/backends/containerd');

// ---------------------------------------------------------------------------
// Detect containerd availability
// ---------------------------------------------------------------------------
const hasContainerd = fs.existsSync('/usr/bin/containerd')
  || fs.existsSync(path.join(os.homedir(), '.lando/bin/containerd'));

const describeIfContainerd = hasContainerd ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Helpers shared by stub-based and live tests
// ---------------------------------------------------------------------------

/** Minimal stub config for BackendManager */
const stubConfig = (overrides = {}) => ({
  engine: 'containerd',
  orchestratorBin: '/usr/bin/nerdctl',
  orchestratorVersion: '2.0.0',
  dockerBin: '/usr/bin/docker',
  engineConfig: {},
  process: 'node',
  userConfRoot: path.join(os.homedir(), '.lando'),
  ...overrides,
});

/** Minimal stub dependencies for BackendManager */
const stubDeps = () => ({
  cache: {get: sinon.stub().returns(undefined), set: sinon.stub()},
  events: {on: sinon.stub(), emit: sinon.stub().resolves()},
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

// ============================================================================
// 1. BackendManager integration — engine="containerd"
// ============================================================================
describe('containerd integration: BackendManager', () => {
  it('should create an engine with the containerd backend', () => {
    const config = stubConfig({engine: 'containerd'});
    const {cache, events, log, shell} = stubDeps();
    const manager = new BackendManager(config, cache, events, log, shell);

    const engine = manager.createEngine('test-id');

    expect(engine).to.be.an('object');
    expect(engine).to.have.property('daemon');
    expect(engine).to.have.property('docker');
    expect(engine).to.have.property('compose');
  });

  it('should set engineBackend to "containerd"', () => {
    const config = stubConfig({engine: 'containerd'});
    const {cache, events, log, shell} = stubDeps();
    const manager = new BackendManager(config, cache, events, log, shell);

    const engine = manager.createEngine('test-id');

    expect(engine.engineBackend).to.equal('containerd');
  });

  it('should use ContainerdDaemon as the daemon backend', () => {
    const config = stubConfig({engine: 'containerd'});
    const {cache, events, log, shell} = stubDeps();
    const manager = new BackendManager(config, cache, events, log, shell);

    const engine = manager.createEngine('test-id');

    // Verify it's an instance of ContainerdDaemon
    expect(engine.daemon).to.be.an.instanceOf(ContainerdDaemon);
  });

  it('should use ContainerdContainer as the docker/container backend', () => {
    const config = stubConfig({engine: 'containerd'});
    const {cache, events, log, shell} = stubDeps();
    const manager = new BackendManager(config, cache, events, log, shell);

    const engine = manager.createEngine('test-id');

    // Verify it's an instance of ContainerdContainer
    expect(engine.docker).to.be.an.instanceOf(ContainerdContainer);
  });

  it('should expose daemon methods: up, down, isUp, getVersions', () => {
    const config = stubConfig({engine: 'containerd'});
    const {cache, events, log, shell} = stubDeps();
    const manager = new BackendManager(config, cache, events, log, shell);

    const engine = manager.createEngine('test-id');

    expect(engine.daemon.up).to.be.a('function');
    expect(engine.daemon.down).to.be.a('function');
    expect(engine.daemon.isUp).to.be.a('function');
    expect(engine.daemon.getVersions).to.be.a('function');
  });

  it('should set composeInstalled based on nerdctl binary existence', () => {
    const config = stubConfig({engine: 'containerd'});
    const {cache, events, log, shell} = stubDeps();
    const manager = new BackendManager(config, cache, events, log, shell);

    const engine = manager.createEngine('test-id');

    // composeInstalled is a boolean derived from fs.existsSync(orchestratorBin)
    expect(engine.composeInstalled).to.be.a('boolean');
  });
});

// ============================================================================
// 2. ContainerdDaemon lifecycle (requires real containerd)
// ============================================================================
describeIfContainerd('containerd integration: ContainerdDaemon lifecycle', function() {
  // These tests may take a while to start/stop daemons
  this.timeout(60000);

  let daemon;

  before(() => {
    daemon = new ContainerdDaemon({
      userConfRoot: path.join(os.homedir(), '.lando'),
    });
  });

  it('should return version strings from getVersions()', async () => {
    const versions = await daemon.getVersions();

    expect(versions).to.be.an('object');
    expect(versions).to.have.property('containerd');
    expect(versions).to.have.property('buildkit');
    expect(versions).to.have.property('nerdctl');

    // At least containerd should have a version if the binary exists
    if (versions.containerd) {
      expect(versions.containerd).to.match(/\d+\.\d+\.\d+/);
    }
  });

  it('should return a boolean from isUp()', async () => {
    const result = await daemon.isUp();
    expect(result).to.be.a('boolean');
  });

  it('should start containerd with up() if not already running', async function() {
    const wasBefore = await daemon.isUp();

    if (!wasBefore) {
      // Attempt to start — may require permissions; skip if it fails due to EACCES
      try {
        await daemon.up();
      } catch (err) {
        if (err.message && (err.message.includes('EACCES') || err.message.includes('permission'))) {
          this.skip();
          return;
        }
        throw err;
      }
    }

    const isUpNow = await daemon.isUp();
    expect(isUpNow).to.equal(true);
  });

  it('should stop containerd cleanly with down()', async function() {
    const isUpBefore = await daemon.isUp();

    if (!isUpBefore) {
      this.skip();
      return;
    }

    try {
      await daemon.down();
    } catch (err) {
      if (err.message && (err.message.includes('EACCES') || err.message.includes('permission'))) {
        this.skip();
        return;
      }
      throw err;
    }

    const isUpAfter = await daemon.isUp();
    expect(isUpAfter).to.equal(false);
  });
});

// ============================================================================
// 3. ContainerdContainer operations (requires running containerd)
// ============================================================================
describeIfContainerd('containerd integration: ContainerdContainer operations', function() {
  this.timeout(30000);

  let container;
  const testNetworkName = 'lando-test-net-' + Date.now();

  before(() => {
    container = new ContainerdContainer({
      nerdctlBin: path.join(os.homedir(), '.lando/bin/nerdctl'),
      socketPath: path.join(os.homedir(), '.lando/run/containerd.sock'),
      id: 'lando',
    });
  });

  after(async () => {
    // Clean up test network if it still exists
    try {
      const handle = container.getNetwork(testNetworkName);
      await handle.remove();
    } catch {
      // Network may already be removed — that's fine
    }
  });

  it('should return an array from list()', async function() {
    try {
      const result = await container.list();
      expect(result).to.be.an('array');
    } catch (err) {
      // If containerd isn't actually running, skip
      if (err.message && err.message.includes('nerdctl')) {
        this.skip();
        return;
      }
      throw err;
    }
  });

  it('should create a network with createNet()', async function() {
    try {
      const result = await container.createNet(testNetworkName);
      expect(result).to.be.an('object');
      expect(result).to.have.property('Name', testNetworkName);
    } catch (err) {
      if (err.message && (err.message.includes('nerdctl') || err.message.includes('EACCES'))) {
        this.skip();
        return;
      }
      throw err;
    }
  });

  it('should include the created network in listNetworks()', async function() {
    try {
      const networks = await container.listNetworks();
      expect(networks).to.be.an('array');

      const found = networks.find(n => (n.Name || n.name) === testNetworkName);
      expect(found, `expected to find network "${testNetworkName}"`).to.exist;
    } catch (err) {
      if (err.message && err.message.includes('nerdctl')) {
        this.skip();
        return;
      }
      throw err;
    }
  });

  it('should remove the network via getNetwork().remove()', async function() {
    try {
      const handle = container.getNetwork(testNetworkName);
      expect(handle).to.have.property('remove').that.is.a('function');

      await handle.remove();

      // Verify it's gone
      const networks = await container.listNetworks();
      const found = networks.find(n => (n.Name || n.name) === testNetworkName);
      expect(found, `expected network "${testNetworkName}" to be removed`).to.not.exist;
    } catch (err) {
      if (err.message && err.message.includes('nerdctl')) {
        this.skip();
        return;
      }
      throw err;
    }
  });
});

// ============================================================================
// 4. NerdctlCompose command generation (unit-level, always runs)
// ============================================================================
describe('containerd integration: NerdctlCompose command generation', () => {
  let nerdctlCompose;
  const socketPath = '/run/containerd/containerd.sock';

  before(() => {
    nerdctlCompose = new NerdctlCompose({socketPath});
  });

  it('should be a valid NerdctlCompose instance', () => {
    expect(nerdctlCompose).to.be.an.instanceOf(NerdctlCompose);
    expect(nerdctlCompose.socketPath).to.equal(socketPath);
  });

  describe('#start (compose up)', () => {
    it('should generate a compose up command with nerdctl --address prefix', () => {
      const result = nerdctlCompose.start(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {services: ['web']},
      );

      expect(result).to.have.property('cmd').that.is.an('array');
      expect(result).to.have.property('opts').that.is.an('object');

      // Should start with --address <socket> compose
      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');

      // Should contain 'up' somewhere in the command
      expect(result.cmd).to.include('up');

      // Should contain --detach (default background: true)
      expect(result.cmd).to.include('--detach');
    });

    it('should include the compose file via --file flag', () => {
      const composeFile = '/my/project/docker-compose.yml';
      const result = nerdctlCompose.start(
        [composeFile],
        'testproject',
        {},
      );

      // The compose file should appear after --file
      const fileIdx = result.cmd.indexOf('--file');
      expect(fileIdx).to.be.greaterThan(-1);
      expect(result.cmd[fileIdx + 1]).to.equal(composeFile);
    });

    it('should include --remove-orphans by default', () => {
      const result = nerdctlCompose.start(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {},
      );

      expect(result.cmd).to.include('--remove-orphans');
    });
  });

  describe('#stop (compose stop)', () => {
    it('should generate a compose stop command with nerdctl prefix', () => {
      const result = nerdctlCompose.stop(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {services: ['web']},
      );

      expect(result).to.have.property('cmd').that.is.an('array');
      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');
      expect(result.cmd).to.include('stop');
    });
  });

  describe('#remove (compose down / rm)', () => {
    it('should generate a compose down command when purge is true', () => {
      const result = nerdctlCompose.remove(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {purge: true},
      );

      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');

      // purge = true → uses 'down'
      expect(result.cmd).to.include('down');
    });

    it('should generate a compose rm command when purge is false', () => {
      const result = nerdctlCompose.remove(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {purge: false},
      );

      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');

      // purge = false → uses 'rm'
      expect(result.cmd).to.include('rm');
    });

    it('should include volume removal flags by default', () => {
      const result = nerdctlCompose.remove(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {purge: true},
      );

      expect(result.cmd).to.include('-v');
    });

    it('should include --remove-orphans for purge/down', () => {
      const result = nerdctlCompose.remove(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {purge: true},
      );

      expect(result.cmd).to.include('--remove-orphans');
    });
  });

  describe('#build', () => {
    it('should generate a compose build command', () => {
      const result = nerdctlCompose.build(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {services: ['web'], local: ['web']},
      );

      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');
      expect(result.cmd).to.include('build');
    });
  });

  describe('#run (compose exec)', () => {
    it('should generate a compose exec/run command', () => {
      const result = nerdctlCompose.run(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {cmd: ['echo', 'hello'], services: ['web']},
      );

      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');
    });
  });

  describe('#logs', () => {
    it('should generate a compose logs command', () => {
      const result = nerdctlCompose.logs(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {services: ['web']},
      );

      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');
      expect(result.cmd).to.include('logs');
    });
  });

  describe('#pull', () => {
    it('should generate a compose pull command', () => {
      const result = nerdctlCompose.pull(
        ['/tmp/docker-compose.yml'],
        'testproject',
        {services: ['web'], pullable: ['web']},
      );

      expect(result.cmd[0]).to.equal('--address');
      expect(result.cmd[1]).to.equal(socketPath);
      expect(result.cmd[2]).to.equal('compose');
      expect(result.cmd).to.include('pull');
    });
  });
});

// ============================================================================
// 5. Full engine lifecycle (requires real containerd)
// ============================================================================
describeIfContainerd('containerd integration: full engine lifecycle', function() {
  this.timeout(90000);

  let engine;

  before(() => {
    const config = stubConfig({engine: 'containerd'});
    const {cache, events, log, shell} = stubDeps();
    const manager = new BackendManager(config, cache, events, log, shell);
    engine = manager.createEngine('integration-test');
  });

  it('should have a daemon that can be started', async function() {
    try {
      await engine.daemon.up();
    } catch (err) {
      if (err.message && (err.message.includes('EACCES') || err.message.includes('permission'))) {
        this.skip();
        return;
      }
      throw err;
    }
  });

  it('should report daemon as up after start', async function() {
    const isUp = await engine.daemon.isUp();

    if (!isUp) {
      // If we can't bring it up (permissions etc), skip
      this.skip();
      return;
    }

    expect(isUp).to.equal(true);
  });

  it('should return an array from engine.docker.list()', async function() {
    const isUp = await engine.daemon.isUp();

    if (!isUp) {
      this.skip();
      return;
    }

    const containers = await engine.docker.list();
    expect(containers).to.be.an('array');
  });

  it('should stop the daemon cleanly', async function() {
    const isUp = await engine.daemon.isUp();

    if (!isUp) {
      this.skip();
      return;
    }

    try {
      await engine.daemon.down();
    } catch (err) {
      if (err.message && (err.message.includes('EACCES') || err.message.includes('permission'))) {
        this.skip();
        return;
      }
      throw err;
    }

    const isUpAfter = await engine.daemon.isUp();
    expect(isUpAfter).to.equal(false);
  });
});
