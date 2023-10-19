/**
 * Tests for user module.
 * @file user.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
const originalPlatform = process.platform;
chai.should();

const setPlatform = function(platform) {
  Object.defineProperty(process, 'platform', {value: platform});
};
const resetPlatform = function() {
  Object.defineProperty(process, 'platform', {value: originalPlatform});
};

const getGid = require('../utils/get-uid');

describe('get-gid', () => {
  it('should return group 1000 on Windows', () => {
    setPlatform('win32');
    const gid = getGid();
    expect(gid).to.equal('1000');
    expect(gid).to.be.a('string');
    expect(isFinite(gid)).to.equal(true);
    resetPlatform();
  });

  it('should return a gid when no argument is specified', () => {
    const gid = getGid();
    expect(gid).to.be.a('string');
    expect(isFinite(gid)).to.equal(true);
  });


  it('should return gid as a string', () => {
    const gid = getGid();
    expect(gid).to.be.a('string');
  });
});
