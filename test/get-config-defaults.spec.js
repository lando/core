/**
 * Tests for config system.
 * @file config.spec.js
 */

'use strict';

const _ = require('lodash');
const chai = require('chai');
const expect = chai.expect;
const hasher = require('object-hash');
chai.should();

const getConfigDefaults = require('../utils/get-config-defaults');

describe('get-config-defaults', () => {
  it('should return a properly structured default config object', () => {
    const defaults = getConfigDefaults();
    expect(!_.hasIn(defaults, 'orchestratorBin')).to.equal(true);
    expect(_.hasIn(defaults, 'orchestratorVersion')).to.equal(true);
    expect(_.hasIn(defaults, 'orchestratorSeparator')).to.equal(true);
    expect(_.hasIn(defaults, 'configSources')).to.be.equal(true);
    expect(_.hasIn(defaults, 'dockerBin')).to.equal(true);
    expect(_.hasIn(defaults, 'dockerBinDir')).to.equal(true);
    expect(_.hasIn(defaults, 'env')).to.equal(true);
    expect(_.hasIn(defaults, 'home')).to.equal(true);
    expect(_.hasIn(defaults, 'logLevel')).to.equal(true);
    expect(_.hasIn(defaults, 'node')).to.equal(true);
    expect(_.hasIn(defaults, 'os')).to.equal(true);
    expect(_.hasIn(defaults, 'os.type')).to.equal(true);
    expect(_.hasIn(defaults, 'os.platform')).to.equal(true);
    expect(_.hasIn(defaults, 'os.release')).to.equal(true);
    expect(_.hasIn(defaults, 'os.arch')).to.equal(true);
    expect(_.hasIn(defaults, 'plugins')).to.equal(true);
    expect(_.hasIn(defaults, 'process')).to.equal(true);
    expect(_.hasIn(defaults, 'userConfRoot')).to.equal(true);
    expect(_.get(defaults, 'orchestratorSeparator')).to.equal('_');
    expect(_.get(defaults, 'configSources')).to.be.an('array');
  });

  it('should mirror process.env', () => {
    const env = getConfigDefaults().env;
    expect(hasher(env)).to.equal(hasher(process.env));
    process.env.NEW = 'things';
    expect(hasher(env)).to.equal(hasher(process.env));
    delete process.env.NEW;
    expect(hasher(env)).to.equal(hasher(process.env));
    env.NEW2 = 'morethings';
    expect(hasher(env)).to.equal(hasher(process.env));
    delete env.NEW2;
    expect(hasher(env)).to.equal(hasher(process.env));
  });

  it('config.process should return "browser" if in a browser', () => {
    process.versions.chrome = 'test';
    const processType = getConfigDefaults().process;
    expect(processType).to.equal('browser');
    delete process.versions.chrome;
  });

  it('config.process should return "node" if not in a browser', () => {
    delete process.versions.chrome;
    delete process.versions.electron;
    delete process.versions['atom-shell'];
    const processType = getConfigDefaults().process;
    expect(processType).to.equal('node');
  });
});
