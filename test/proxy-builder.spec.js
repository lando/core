/*
 * Tests for the proxy service builder.
 * @file proxy-builder.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const {builder} = require('../builders/_proxy');

// a stand-in parent that just keeps the compose fragments it is handed
const Parent = class {
  constructor(id, config, ...sources) {
    this.sources = sources;
  }
};

const proxyService = engineProvider => {
  const LandoProxy = builder(Parent, {});
  const options = {proxyCommand: ['traefik'], proxyDomain: 'lndo.site', userConfRoot: '/tmp/lando', engineProvider};
  return new LandoProxy('80', '443', options).sources[0].services.proxy;
};

describe('_proxy builder', () => {
  const originalLandoPlatform = process.landoPlatform;
  beforeEach(() => {
    process.landoPlatform = 'darwin';
  });
  afterEach(() => {
    process.landoPlatform = originalLandoPlatform;
  });

  // live-tested: traefik on podman logged "dial unix /var/run/docker.sock: connect: permission denied"
  it('should disable selinux labeling for the proxy on podman', () => {
    expect(proxyService('podman').security_opt).to.deep.equal(['label=disable']);
  });

  it('should not add security_opt for other engines', () => {
    expect(proxyService('orbstack')).to.not.have.property('security_opt');
    expect(proxyService(undefined)).to.not.have.property('security_opt');
  });
});
