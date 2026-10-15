/*
 * Tests for the proxy config hook.
 * @file lando-set-proxy-config.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const hook = require('../hooks/lando-set-proxy-config');

const run = async (engineProvider, {platform = 'darwin', bindAddress = '127.0.0.1'} = {}) => {
  const lando = {
    log: {verbose: () => {}},
    cache: {get: () => undefined},
    config: {
      engineProvider,
      os: {landoPlatform: platform},
      orchestratorSeparator: '_',
      proxyName: 'landoproxy',
      proxyCache: 'proxy',
      userConfRoot: '/tmp/lando',
      proxyBindAddress: bindAddress,
      proxyHttpPort: '80',
      proxyHttpsPort: '443',
      proxyHttpFallbacks: ['8000', '8080'],
      proxyHttpsFallbacks: ['444', '4433'],
    },
  };
  await hook(lando);
  return lando.config;
};

describe('lando-set-proxy-config', () => {
  it('should keep 80/443 first for engines that can bind privileged ports', async () => {
    const config = await run('orbstack');
    expect(config.proxyHttpPorts).to.deep.equal(['80', '8000', '8080']);
    expect(config.proxyCurrentPorts).to.deep.equal({http: '80', https: '443'});
  });

  // live-tested: podman's gvproxy failed "cannot bind port 127.0.0.1:444: permission denied"
  it('should drop ports below 1024 for podman on macOS and stay on loopback', async () => {
    const config = await run('podman');
    expect(config.proxyHttpPorts).to.deep.equal(['8000', '8080']);
    expect(config.proxyHttpsPorts).to.deep.equal(['4433']);
    expect(config.proxyCurrentPorts).to.deep.equal({http: '8000', https: '4433'});
    expect(config.proxyScanHttp[0]).to.equal('http://127.0.0.1:8000');
  });

  it('should keep privileged ports for podman when binding all interfaces', async () => {
    const config = await run('podman', {bindAddress: '0.0.0.0'});
    expect(config.proxyHttpPorts[0]).to.equal('80');
  });

  it('should leave linux alone', async () => {
    const config = await run('podman', {platform: 'linux'});
    expect(config.proxyHttpPorts[0]).to.equal('80');
  });
});
