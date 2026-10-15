/*
 * Tests for the run-setup hook.
 * @file lando-run-setup.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const Cache = require('../lib/cache');
const Events = require('../lib/events');
const Log = require('../lib/logger');
const Shell = require('../lib/shell');
const hook = require('../hooks/lando-run-setup');

describe('lando-run-setup', () => {
  const originalDockerHost = process.env.DOCKER_HOST;
  afterEach(() => {
    if (originalDockerHost === undefined) delete process.env.DOCKER_HOST;
    else process.env.DOCKER_HOST = originalDockerHost;
  });

  // autosetup used to rebuild engineConfig from defaults, moving apps back to /var/run/docker.sock
  it('should keep a configured engine socket after running setup', async () => {
    if (process.platform === 'win32') return;
    const engineConfig = {host: '127.0.0.1', port: 2376, socketPath: '/tmp/orbstack.sock'};
    const lando = {
      config: {setup: {}, engineConfig, engineProvider: 'orbstack', userConfRoot: '/tmp', instance: 'test'},
      cache: new Cache(),
      events: new Events(),
      log: new Log(),
      shell: new Shell(),
      getSetupStatus: async () => [{id: 'something', state: 'NOT INSTALLED'}],
      setup: async () => {},
      reloadPlugins: async () => {},
    };

    await hook(lando);

    expect(lando.config.engineConfig.socketPath).to.equal('/tmp/orbstack.sock');
    expect(lando.engine.docker.modem.socketPath).to.equal('/tmp/orbstack.sock');
    expect(process.env.DOCKER_HOST).to.equal('unix:///tmp/orbstack.sock');
  });
});
