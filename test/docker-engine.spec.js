'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const DockerEngine = require('./../components/docker-engine');

describe('docker-engine', () => {
  describe('#build', () => {
    it('should delegate containerd builds to buildx/buildctl', () => {
      const engine = new DockerEngine({
        containerdMode: true,
        userConfRoot: '/tmp/.lando-test',
      });
      const stub = sinon.stub(engine, 'buildx').returns('delegated');

      const result = engine.build('/tmp/Dockerfile', {tag: 'example/test:latest'});

      expect(result).to.equal('delegated');
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithMatch(stub, '/tmp/Dockerfile', {tag: 'example/test:latest'});
    });
  });

  describe('#_getContainerdBuildctlCommand', () => {
    it('should generate a buildctl command for containerd image builds', () => {
      const engine = new DockerEngine({
        containerdMode: true,
        buildctlBin: '/usr/local/lib/lando/bin/buildctl',
        buildkitHost: 'unix:///run/lando/buildkitd.sock',
        userConfRoot: '/tmp/.lando-test',
      });

      const result = engine._getContainerdBuildctlCommand({
        buildArgs: {FOO: 'bar', BAZ: 'qux'},
        context: '/tmp/build-context',
        dockerfile: '/tmp/build-context/Dockerfile',
        outputPath: '/tmp/build-context/image.tar',
        tag: 'example/test:latest',
      });

      expect(result.command).to.equal('/usr/local/lib/lando/bin/buildctl');
      expect(result.args).to.deep.equal([
        '--addr', 'unix:///run/lando/buildkitd.sock',
        'build',
        '--frontend', 'dockerfile.v0',
        '--local', 'context=/tmp/build-context',
        '--local', 'dockerfile=/tmp/build-context',
        '--opt', 'filename=Dockerfile',
        '--opt', `platform=${process.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64'}`,
        '--output', 'type=docker,name=example/test:latest,dest=/tmp/build-context/image.tar',
        '--progress=plain',
        '--opt', 'build-arg:FOO=bar',
        '--opt', 'build-arg:BAZ=qux',
      ]);
    });
  });

  describe('#_getContainerdNerdctlLoadCommand', () => {
    it('should generate a sudo nerdctl load command for built images', () => {
      const engine = new DockerEngine({
        containerdMode: true,
        containerdSocket: '/run/lando/containerd.sock',
        containerdNamespace: 'default',
        userConfRoot: '/tmp/.lando-test',
      });

      const result = engine._getContainerdNerdctlLoadCommand('/tmp/build-context/image.tar');

      expect(result.command).to.equal('sudo');
      expect(result.args[0]).to.equal('-n');
      expect(result.args.slice(1)).to.deep.equal([
        '/tmp/.lando-test/bin/nerdctl',
        '--address', '/run/lando/containerd.sock',
        '--namespace', 'default',
        'load',
        '-i', '/tmp/build-context/image.tar',
      ]);
    });
  });
});
