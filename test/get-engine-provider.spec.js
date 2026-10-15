/*
 * Tests for get-engine-provider.
 * @file get-engine-provider.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const getEngineProvider = require('../utils/get-engine-provider');

// fake filesystem: only the listed app bundles exist
const only = (...apps) => ({
  home: '/Users/me',
  tmpdir: '/var/folders/x/T',
  exists: file => apps.includes(file),
  which: () => '/opt/homebrew/bin/podman',
});

describe('get-engine-provider', () => {
  it('should resolve auto to docker-desktop when Docker.app exists, even alongside others', () => {
    const opts = only('/Applications/Docker.app', '/Applications/OrbStack.app');
    expect(getEngineProvider('auto', opts).name).to.equal('docker-desktop');
  });

  it('should resolve auto to orbstack when Docker.app is missing', () => {
    const provider = getEngineProvider('auto', only('/Applications/OrbStack.app', '/Applications/Rancher Desktop.app'));
    expect(provider.name).to.equal('orbstack');
    expect(provider.socketPath).to.equal('/Users/me/.orbstack/run/docker.sock');
  });

  it('should resolve auto to rancher when only Rancher Desktop exists', () => {
    const provider = getEngineProvider('auto', only('/Applications/Rancher Desktop.app'));
    expect(provider.name).to.equal('rancher');
    expect(provider.socketPath).to.equal('/Users/me/.rd/docker.sock');
  });

  it('should fall back to docker-desktop when nothing is installed', () => {
    expect(getEngineProvider('auto', only()).name).to.equal('docker-desktop');
  });

  it('should honor an explicit provider regardless of what is installed', () => {
    expect(getEngineProvider('orbstack', only('/Applications/Docker.app')).name).to.equal('orbstack');
  });

  it('should resolve podman to its default machine api socket in TMPDIR and start it with podman machine', () => {
    const provider = getEngineProvider('podman', only());
    expect(provider.socketPath).to.equal('/var/folders/x/T/podman/podman-machine-default-api.sock');
    expect(provider.start).to.deep.equal(['/opt/homebrew/bin/podman', 'machine', 'start']);
  });

  it('should never pick podman for auto, even when it is the only engine installed', () => {
    expect(getEngineProvider('auto', only('/opt/homebrew/bin/podman')).name).to.equal('docker-desktop');
  });

  it('should throw on an unknown provider', () => {
    expect(() => getEngineProvider('colima', only())).to.throw(/Unknown engineProvider "colima"/);
  });
});
