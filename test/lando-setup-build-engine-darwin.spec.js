/*
 * Tests for the darwin build engine setup hook.
 * @file lando-setup-build-engine-darwin.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const Log = require('../lib/logger');
const hook = require('../hooks/lando-setup-build-engine-darwin');

const run = async engineProvider => {
  const options = {buildEngine: '4.85.0', tasks: []};
  await hook({config: {engineProvider}, log: new Log()}, options);
  return options.tasks;
};

describe('lando-setup-build-engine-darwin', () => {
  it('should add the Docker Desktop install task for docker-desktop', async () => {
    const tasks = await run('docker-desktop');
    expect(tasks.map(task => task.id)).to.deep.equal(['setup-build-engine']);
  });

  it('should not install Docker Desktop when OrbStack is the provider', async () => {
    expect(await run('orbstack')).to.deep.equal([]);
  });

  it('should not install Docker Desktop when Rancher Desktop is the provider', async () => {
    expect(await run('rancher')).to.deep.equal([]);
  });
});
