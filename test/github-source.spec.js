/*
 * Tests for the GitHub init source.
 * @file github-source.spec.js
 */

'use strict';

const chai = require('chai');
chai.should();

const source = require('../sources/github').sources[0];
const lando = {
  cache: {get: () => []},
  config: {uid: 1000, userConfRoot: '/tmp/lando'},
};

describe('github source', () => {
  it('should not prompt for a token when GitHub authentication is explicitly disabled', () => {
    const authPrompt = source.options(lando)['github-auth-token'].interactive;
    authPrompt.when({'source': 'github', 'github-auth': false}).should.equal(false);
  });

  it('should clone repositories without GitHub credentials or SSH key mutation when auth is disabled', () => {
    const steps = source.build({
      'github-auth': false,
      'github-repo': 'https://github.com/lando/lando.git',
    }, lando);
    steps.map(step => step.name).should.deep.equal(['wait-for-user', 'clone-repo']);
  });

  it('should preserve SSH key setup and authenticated-user caching for SSH repositories', () => {
    const steps = source.build({
      'github-auth': 'token',
      'github-key-name': 'Landokey',
      'github-repo': 'git@github.com:lando/lando.git',
    }, lando);
    steps.map(step => step.name).should.deep.equal([
      'wait-for-user',
      'generate-key',
      'post-key',
      'reload-keys',
      'clone-repo',
      'set-caches',
    ]);
  });

  it('should preserve SSH key setup and credential caching for HTTPS repositories when auth is provided', () => {
    const steps = source.build({
      'github-auth': 'token',
      'github-key-name': 'Landokey',
      'github-repo': 'https://github.com/lando/lando.git',
    }, lando);
    steps.map(step => step.name).should.deep.equal([
      'wait-for-user',
      'generate-key',
      'post-key',
      'reload-keys',
      'clone-repo',
      'set-caches',
    ]);
  });

  it('should skip SSH key setup and credential caching when auth is explicitly disabled', () => {
    const steps = source.build({
      'github-auth': 'false',
      'github-repo': 'git@github.com:lando/lando.git',
    }, lando);
    steps.map(step => step.name).should.deep.equal(['wait-for-user', 'clone-repo']);
  });
});
