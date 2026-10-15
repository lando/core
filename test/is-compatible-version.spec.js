/*
 * Tests for is-compatible-version.
 * @file is-compatible-version.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const isCompatibleVersion = require('../utils/is-compatible-version');

describe('is-compatible-version', () => {
  it('should return true for a version inside the range', () => {
    expect(isCompatibleVersion('4.85.0', {satisfies: '>=4.0.0 <5'})).to.equal(true);
  });

  it('should return false for a version outside the range', () => {
    expect(isCompatibleVersion('2.2.3', {satisfies: '>=4.0.0 <5'})).to.equal(false);
  });

  // lando/core#138: no Docker.app yields a null version, which used to throw "reading 'trim'"
  it('should return false instead of throwing on a null or garbage version', () => {
    expect(isCompatibleVersion(null, {satisfies: '>=4.0.0 <5'})).to.equal(false);
    expect(isCompatibleVersion(undefined, {satisfies: '>=4.0.0 <5'})).to.equal(false);
    expect(isCompatibleVersion('skip', {satisfies: '>=4.0.0 <5'})).to.equal(false);
  });
});
