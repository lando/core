/*
 * Tests for nerdctl-compose.
 * @file nerdctl-compose.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const NerdctlCompose = require('./../lib/backends/containerd/nerdctl-compose');

const defaultSocketPath = '/run/lando/containerd.sock';
const customSocketPath = '/tmp/lando/run/containerd.sock';

const composeFiles = ['docker-compose.yml', 'docker-compose.override.yml'];
const project = 'myproject';

describe('nerdctl-compose', () => {
  describe('#NerdctlCompose', () => {
    it('should be a constructor', () => {
      expect(NerdctlCompose).to.be.a('function');
    });

    it('should set the default socket path', () => {
      const nc = new NerdctlCompose();
      nc.socketPath.should.equal(defaultSocketPath);
    });

    it('should accept a custom socket path', () => {
      const nc = new NerdctlCompose({socketPath: customSocketPath});
      nc.socketPath.should.equal(customSocketPath);
    });
  });

  describe('#_transform', () => {
    it('should prepend connection flags and compose to cmd', () => {
      const nc = new NerdctlCompose({socketPath: customSocketPath});
      const result = nc._transform({cmd: ['up', '--detach'], opts: {mode: 'attach'}});

      result.cmd.should.deep.equal([
        '--address', customSocketPath, '--namespace', 'default', 'compose',
        'up', '--detach',
      ]);
      result.opts.mode.should.equal('attach');
    });

    it('should preserve existing opts while merging auth env when needed', () => {
      const nc = new NerdctlCompose();
      const originalOpts = {cwd: '/tmp', env: {FOO: 'bar'}};
      const result = nc._transform({cmd: ['ps'], opts: originalOpts});

      result.opts.cwd.should.equal('/tmp');
      result.opts.env.FOO.should.equal('bar');
      result.opts.env.CONTAINERD_ADDRESS.should.equal(defaultSocketPath);
      result.opts.env.CONTAINERD_NAMESPACE.should.equal('default');
      originalOpts.env.FOO.should.equal('bar');
    });
  });

  describe('#start', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose({socketPath: customSocketPath});
      const result = nc.start(composeFiles, project, {});

      expect(result).to.be.an('object');
      expect(result).to.have.property('cmd').that.is.an('array');
      expect(result).to.have.property('opts').that.is.an('object');
    });

    it('should include connection flags and compose in cmd', () => {
      const nc = new NerdctlCompose({socketPath: customSocketPath});
      const result = nc.start(composeFiles, project, {});

      result.cmd[0].should.equal('--address');
      result.cmd[1].should.equal(customSocketPath);
      result.cmd[2].should.equal('--namespace');
      result.cmd[3].should.equal('default');
      result.cmd[4].should.equal('compose');
    });

    it('should include project name in cmd', () => {
      const nc = new NerdctlCompose();
      const result = nc.start(composeFiles, project, {});

      result.cmd.should.include('--project-name');
      result.cmd.should.include(project);
    });
  });

  describe('#build', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.build(composeFiles, project, {services: ['web'], local: ['web']});

      expect(result).to.be.an('object');
      expect(result).to.have.property('cmd').that.is.an('array');
      expect(result).to.have.property('opts');
    });

    it('should include compose prefix with connection flags', () => {
      const nc = new NerdctlCompose({socketPath: customSocketPath});
      const result = nc.build(composeFiles, project, {services: ['web'], local: ['web']});

      result.cmd[0].should.equal('--address');
      result.cmd[1].should.equal(customSocketPath);
      result.cmd[2].should.equal('--namespace');
      result.cmd[3].should.equal('default');
      result.cmd[4].should.equal('compose');
    });

    it('should include build subcommand when local services match', () => {
      const nc = new NerdctlCompose();
      const result = nc.build(composeFiles, project, {services: ['web'], local: ['web']});

      // After the compose prefix, should have file flags, project, and 'build'
      result.cmd.should.include('build');
    });

    it('should fall back to ps when no local services match', () => {
      const nc = new NerdctlCompose();
      // services are specified but local is empty — nothing to build
      const result = nc.build(composeFiles, project, {services: ['web'], local: []});

      // compose.build falls back to 'ps' when there's nothing to build
      result.cmd.should.include('ps');
    });
  });

  describe('#remove', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.remove(composeFiles, project, {});

      expect(result).to.be.an('object');
      expect(result).to.have.property('cmd');
      expect(result).to.have.property('opts');
    });

    it('should use down when purge is true', () => {
      const nc = new NerdctlCompose();
      const result = nc.remove(composeFiles, project, {purge: true});

      result.cmd.should.include('down');
    });

    it('should use rm when purge is false', () => {
      const nc = new NerdctlCompose();
      const result = nc.remove(composeFiles, project, {purge: false});

      result.cmd.should.include('rm');
    });
  });

  describe('#run', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.run(composeFiles, project, {
        cmd: ['drush', 'cr'],
        services: ['appserver'],
      });

      expect(result).to.be.an('object');
      expect(result).to.have.property('cmd');
      expect(result).to.have.property('opts');
    });

    it('should include the compose prefix', () => {
      const nc = new NerdctlCompose({socketPath: customSocketPath});
      const result = nc.run(composeFiles, project, {
        cmd: ['ls'],
        services: ['web'],
      });

      result.cmd[0].should.equal('--address');
      result.cmd[1].should.equal(customSocketPath);
      result.cmd[2].should.equal('--namespace');
      result.cmd[3].should.equal('default');
      result.cmd[4].should.equal('compose');
    });
  });

  describe('#stop', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.stop(composeFiles, project, {});

      expect(result).to.be.an('object');
      result.cmd.should.include('stop');
    });

    it('should include compose prefix', () => {
      const nc = new NerdctlCompose({socketPath: customSocketPath});
      const result = nc.stop(composeFiles, project, {});

      result.cmd.slice(0, 5).should.deep.equal([
        '--address', customSocketPath, '--namespace', 'default', 'compose',
      ]);
    });
  });

  describe('#logs', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.logs(composeFiles, project, {});

      expect(result).to.be.an('object');
      result.cmd.should.include('logs');
    });
  });

  describe('#pull', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.pull(composeFiles, project, {});

      expect(result).to.be.an('object');
      expect(result).to.have.property('cmd');
    });
  });

  describe('#getId', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.getId(composeFiles, project, {});

      expect(result).to.be.an('object');
      result.cmd.should.include('ps');
    });
  });

  describe('#kill', () => {
    it('should return an object with cmd and opts', () => {
      const nc = new NerdctlCompose();
      const result = nc.kill(composeFiles, project, {});

      expect(result).to.be.an('object');
      result.cmd.should.include('kill');
    });
  });
});
