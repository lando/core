/*
 * Tests for get-nerdctl-config.
 *
 * The nerdctl config controls how nerdctl's OCI hooks resolve CNI paths.
 * If the config has wrong paths, OCI hooks fall back to /etc/cni/net.d/ and
 * self-deadlock on the system .nerdctl.lock file.  These tests ensure the
 * config always points to Lando's isolated CNI directories.
 *
 * @file get-nerdctl-config.spec.js
 */

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

  it('should use /etc/lando/cni as cni_netconfpath (NOT /etc/cni/net.d/)', () => {
    // CRITICAL: If cni_netconfpath falls back to /etc/cni/net.d/ (the system
    // default), nerdctl OCI hooks will self-deadlock on /etc/cni/net.d/.nerdctl.lock.
    // The config MUST point to Lando's isolated CNI directory.
    const config = getNerdctlConfig();
    expect(config).to.not.include('/etc/cni/net.d');
    expect(config).to.include('cni_netconfpath = "/etc/lando/cni"');
  });

  it('should strip "finch" from cni_netconfpath when provided', () => {
    // nerdctl internally appends the namespace (e.g. "finch") as a subdirectory
    // to cni_netconfpath, so we must provide the parent directory.
    const config = getNerdctlConfig({cniNetconfPath: '/etc/lando/cni/finch'});
    expect(config).to.include('cni_netconfpath = "/etc/lando/cni"');
    expect(config).to.not.include('cni_netconfpath = "/etc/lando/cni/finch"');
  });

  it('should include the containerd socket address for OCI hook connectivity', () => {
    const config = getNerdctlConfig({containerdSocket: '/run/lando/containerd.sock'});
    expect(config).to.include('address = "/run/lando/containerd.sock"');
  });

  it('should include namespace for OCI hook context', () => {
    const config = getNerdctlConfig();
    expect(config).to.include('namespace = "default"');
  });

  it('should allow custom namespace override', () => {
    const config = getNerdctlConfig({namespace: 'finch'});
    expect(config).to.include('namespace = "finch"');
  });

  it('should use Lando-specific CNI binary path (NOT /opt/cni/bin)', () => {
    // /opt/cni/bin is the system default.  Lando MUST use its own CNI binaries
    // to avoid conflicts with system containerd/Docker/Podman.
    const config = getNerdctlConfig();
    expect(config).to.not.include('/opt/cni/bin');
    expect(config).to.include('/usr/local/lib/lando/cni/bin');
  });
});
