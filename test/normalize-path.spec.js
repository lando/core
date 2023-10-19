/*
 * Tests for lando-services:utils.
 * @file utils.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
const os = require('os');
const path = require('path');
chai.should();

// Get env module to test
const normalizePath = require('../utils/normalize-path');

// normalizePath method
describe('#ormalize-path', () => {
  // It should return itself if prefixed with a variable like $LANDO_APP_ROOT
  it('should return itself if it starts with $', () => {
    // Get the command
    const local = ['$LANDO_APP_ROOT', 'directory'].join(path.sep);
    const base = path.sep + 'anything';
    const normalized = normalizePath(local, base);

    // Assert the things
    expect(normalized).to.equal(local);
  });

  // It should return itself if local is one of excludes
  it('should return itself if it is one of the excludes', () => {
    // Get the command
    const local = 'nfsmount';
    const base = path.sep + 'anything';
    const excludes = ['nfsmount'];
    const normalized = normalizePath(local, base, excludes);

    // Assert the things
    expect(normalized).to.equal(local);
  });

  // It should return itself if local is an absolute path
  it('should return itself if it is an absolute path', () => {
    // Get the command
    const local = [os.tmpdir(), 'test'].join(path.sep);
    const base = path.sep + 'anything';
    const normalized = normalizePath(local, base);

    // Assert the things
    expect(normalized).to.equal(local);
  });

  // It should return itself if local is an absolute path
  it('should return an absolute path resolved by base if it is a relative path', () => {
    // Get the command
    const local = ['.', '..', 'thing'].join(path.sep);
    const prefix = (process.platform === 'win32') ? 'C:\\' : '/';
    const base = prefix + ['anything', 'thing'].join(path.sep);
    const normalized = normalizePath(local, base);

    // Assert the things
    expect(normalized).to.equal(prefix + ['anything', 'thing'].join(path.sep));
    expect(path.isAbsolute(normalized)).to.equal(true);
  });
});
