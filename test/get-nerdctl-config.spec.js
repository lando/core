'use strict';

const chai = require('chai');
const expect = chai.expect;

const getNerdctlConfig = require('./../utils/get-nerdctl-config');

describe('get-nerdctl-config', () => {
  it('should default CNI path to /usr/local/lib/lando/cni/bin', () => {
    const config = getNerdctlConfig();
    expect(config).to.include('cni_netconfpath = "/etc/lando/cni"');
    expect(config).to.include('cni_path = "/usr/local/lib/lando/cni/bin"');
  });

  it('should allow overriding CNI path', () => {
    const config = getNerdctlConfig({cniPath: '/custom/cni'});
    expect(config).to.include('cni_path = "/custom/cni"');
  });
});
