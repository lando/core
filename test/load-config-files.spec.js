/**
 * Tests for config system.
 * @file config.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
const filesystem = require('mock-fs');
const hasher = require('object-hash');
chai.should();

const loadFiles = require('../utils/load-config-files');

describe('load-config-files', () => {
  it('should return an empty object if no files are specified', () => {
    const fileConfig = loadFiles();
    expect(fileConfig).to.be.empty;
  });

  it('should return data only from files that exist', () => {
    filesystem({'/tmp/config1.yml': 'obiwan: kenobi'});
    const fileConfig = loadFiles(['/tmp/config1.yml', '/tmp/doesnotexist.yml']);
    expect(hasher(fileConfig)).to.equal(hasher({obiwan: 'kenobi'}));
    filesystem.restore();
  });

  it('should give priority to the last file loaded', () => {
    filesystem({
      '/tmp/config1.yml': 'scoundrel: lando',
      '/tmp/config2.yml': 'scoundrel: solo',
    });
    const fileConfig = loadFiles(['/tmp/config1.yml', '/tmp/config2.yml']);
    expect(hasher(fileConfig)).to.equal(hasher({scoundrel: 'solo'}));
    filesystem.restore();
  });
});
