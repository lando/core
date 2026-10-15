/*
 * Tests for get-engine-config.
 * @file get-engine-config.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const getEngineConfig = require('../utils/get-engine-config');

describe('get-engine-config', () => {
  const originalLandoPlatform = process.landoPlatform;
  beforeEach(() => {
    process.landoPlatform = 'darwin';
  });
  afterEach(() => {
    process.landoPlatform = originalLandoPlatform;
  });

  it('should keep the default socket and leave DOCKER_HOST alone with no provider', () => {
    const env = {};
    const config = getEngineConfig({env});
    expect(config.socketPath).to.equal(process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock');
    expect(env).to.not.have.property('DOCKER_HOST');
  });

  // the lando/lando#3388 colima workaround: socketPath alone used to steer dockerode but not docker compose
  it('should export DOCKER_HOST for a user-set socketPath', () => {
    if (process.platform === 'win32') return;
    const env = {};
    getEngineConfig({engineConfig: {host: '127.0.0.1', port: 2376, socketPath: '/tmp/colima.sock'}, env});
    expect(env.DOCKER_HOST).to.equal('unix:///tmp/colima.sock');
  });

  it('should still export a tcp DOCKER_HOST for a remote host', () => {
    const env = {};
    getEngineConfig({engineConfig: {host: '10.0.0.5', port: 2376}, env});
    expect(env.DOCKER_HOST).to.equal('tcp://10.0.0.5:2376');
  });
});
