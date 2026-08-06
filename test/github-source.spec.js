/*
 * Tests for the GitHub init source.
 * @file github-source.spec.js
 */

'use strict';

const chai = require('chai');
chai.should();

const source = require('../sources/github').sources[0];
const lando = {config: {uid: 1000, userConfRoot: '/tmp/lando'}};

describe('github source', () => {
  it('should clone public HTTPS repositories without GitHub credentials or SSH key mutation', () => {
    const steps = source.build({'github-repo': 'https://github.com/lando/lando.git'}, lando);
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

  it('should cache credentials without uploading an SSH key for HTTPS repositories', () => {
    const steps = source.build({
      'github-auth': 'token',
      'github-repo': 'https://github.com/lando/lando.git',
    }, lando);
    steps.map(step => step.name).should.deep.equal(['wait-for-user', 'clone-repo', 'set-caches']);
  });
});
