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

const getUid = require('../utils/get-uid');

// @todo: we need to actually stub out shell-exec because this relies on OS specific things like `id`
describe('get-uid', () => {
  it('should return user 1000 on Windows', () => {
    setPlatform('win32');
    const uid = getUid();
    expect(uid).to.equal('1000');
    expect(uid).to.be.a('string');
    expect(isFinite(uid)).to.equal(true);
    resetPlatform();
  });

  it('should return a uid when no argument is specified', () => {
    const uid = getUid();
    expect(uid).to.be.a('string');
    expect(isFinite(uid)).to.equal(true);
  });


  it('should return uid as a string', () => {
    const uid = getUid();
    expect(uid).to.be.a('string');
  });
});
