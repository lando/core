/*
 * Tests for backend-manager.
 * @file backend-manager.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const sinon = require('sinon');
const fs = require('fs');
const path = require('path');

const BackendManager = require('./../lib/backend-manager');

// Minimal stubs that satisfy the BackendManager constructor
const stubConfig = (overrides = {}) => ({
  engine: 'docker',
  orchestratorBin: '/usr/bin/docker-compose',
  orchestratorVersion: '2.0.0',
  containerdSystemBinDir: '/tmp/.lando-test/bin',
  dockerBin: '/usr/bin/docker',
  engineConfig: {},
  process: 'node',
  userConfRoot: '/tmp/.lando-test',
  ...overrides,
});

const stubDeps = () => ({
  cache: {},
  events: {on: sinon.stub(), emit: sinon.stub()},
  log: {debug: sinon.stub(), verbose: sinon.stub(), info: sinon.stub(), warn: sinon.stub(), error: sinon.stub(), silly: sinon.stub()},
  shell: {sh: sinon.stub().resolves('')},
});

describe('backend-manager', () => {
  describe('#BackendManager', () => {
    it('should be a constructor', () => {
      expect(BackendManager).to.be.a('function');
    });

    it('should store config and dependencies on the instance', () => {
      const config = stubConfig();
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      manager.config.should.equal(config);
      manager.cache.should.equal(cache);
      manager.events.should.equal(events);
      manager.log.should.equal(log);
      manager.shell.should.equal(shell);
    });
  });

  describe('#createEngine', () => {
    it('should return an Engine when engine="docker"', () => {
      const config = stubConfig({engine: 'docker'});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      const engine = manager.createEngine('test-id');
      expect(engine).to.be.an('object');
      // Engine has these key properties
      expect(engine).to.have.property('docker');
      expect(engine).to.have.property('daemon');
      expect(engine).to.have.property('compose');
    });

    it('should return an Engine when engine="containerd"', () => {
      const config = stubConfig({engine: 'containerd'});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      const engine = manager.createEngine('test-id');
      expect(engine).to.be.an('object');
      expect(engine).to.have.property('docker');
      expect(engine).to.have.property('daemon');
      expect(engine).to.have.property('compose');
    });

    it('should wire containerd compose through the nerdctl binary', () => {
      const config = stubConfig({engine: 'containerd'});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      const engine = manager.createEngine('test-id');

      expect(engine.daemon.compose).to.equal('/tmp/.lando-test/bin/nerdctl');
      expect(engine.composeInstalled).to.equal(fs.existsSync('/tmp/.lando-test/bin/nerdctl'));
    });

    it('should default to "auto" when engine is not specified', () => {
      const config = stubConfig({engine: undefined});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      // auto should work without throwing
      const engine = manager.createEngine('test-id');
      expect(engine).to.be.an('object');
      expect(engine).to.have.property('docker');
      expect(engine).to.have.property('daemon');
    });

    it('should use "auto" for any unrecognized engine value', () => {
      const config = stubConfig({engine: 'unknown-value'});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      // The switch default falls through to auto
      const engine = manager.createEngine('test-id');
      expect(engine).to.be.an('object');
    });
  });

  describe('#_createAutoEngine', () => {
    let existsSyncStub;

    afterEach(() => {
      if (existsSyncStub) existsSyncStub.restore();
    });

    it('should select containerd when all three binaries exist', () => {
      existsSyncStub = sinon.stub(fs, 'existsSync');
      // Make all three binary paths return true
      existsSyncStub.returns(false); // default
      existsSyncStub.withArgs(path.join('/tmp/.lando-test', 'bin', 'containerd')).returns(true);
      existsSyncStub.withArgs(path.join('/tmp/.lando-test', 'bin', 'nerdctl')).returns(true);
      existsSyncStub.withArgs(path.join('/tmp/.lando-test', 'bin', 'buildkitd')).returns(true);

      const config = stubConfig({engine: 'auto'});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      // Spy on the private methods to verify which was called
      const containerdSpy = sinon.spy(manager, '_createContainerdEngine');
      const dockerSpy = sinon.spy(manager, '_createDockerEngine');

      manager._createAutoEngine('test-id');

      containerdSpy.calledOnce.should.be.true;
      dockerSpy.called.should.be.false;

      containerdSpy.restore();
      dockerSpy.restore();
    });

    it('should fall back to docker when no containerd binaries exist', () => {
      existsSyncStub = sinon.stub(fs, 'existsSync');
      existsSyncStub.returns(false);

      const config = stubConfig({engine: 'auto'});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      const containerdSpy = sinon.spy(manager, '_createContainerdEngine');
      const dockerSpy = sinon.spy(manager, '_createDockerEngine');

      manager._createAutoEngine('test-id');

      dockerSpy.calledOnce.should.be.true;
      containerdSpy.called.should.be.false;

      containerdSpy.restore();
      dockerSpy.restore();
    });

    it('should fall back to docker when only some containerd binaries exist', () => {
      existsSyncStub = sinon.stub(fs, 'existsSync');
      existsSyncStub.returns(false);
      // Only containerd exists, nerdctl and buildkitd do not
      existsSyncStub.withArgs(path.join('/tmp/.lando-test', 'bin', 'containerd')).returns(true);

      const config = stubConfig({engine: 'auto'});
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      const containerdSpy = sinon.spy(manager, '_createContainerdEngine');
      const dockerSpy = sinon.spy(manager, '_createDockerEngine');

      manager._createAutoEngine('test-id');

      dockerSpy.calledOnce.should.be.true;
      containerdSpy.called.should.be.false;

      containerdSpy.restore();
      dockerSpy.restore();
    });

    it('should respect config override paths for binary detection', () => {
      existsSyncStub = sinon.stub(fs, 'existsSync');
      existsSyncStub.returns(false);

      // Custom binary paths
      const customContainerd = '/opt/custom/containerd';
      const customNerdctl = '/opt/custom/nerdctl';
      const customBuildkitd = '/opt/custom/buildkitd';

      existsSyncStub.withArgs(customContainerd).returns(true);
      existsSyncStub.withArgs(customNerdctl).returns(true);
      existsSyncStub.withArgs(customBuildkitd).returns(true);

      const config = stubConfig({
        engine: 'auto',
        containerdBin: customContainerd,
        nerdctlBin: customNerdctl,
        buildkitdBin: customBuildkitd,
      });
      const {cache, events, log, shell} = stubDeps();
      const manager = new BackendManager(config, cache, events, log, shell);

      const containerdSpy = sinon.spy(manager, '_createContainerdEngine');

      manager._createAutoEngine('test-id');

      containerdSpy.calledOnce.should.be.true;
      containerdSpy.restore();
    });
  });
});
