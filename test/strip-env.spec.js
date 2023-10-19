/**
 * Tests for config system.
 * @file config.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const stripEnv = require('../utils/strip-env');

describe('strip-env', () => {
  it('should return process.env stripped of all keys that start with prefix', () => {
    process.env.DANCE_NOW = 'everybody';
    const result = stripEnv('DANCE');
    expect(result).to.be.an('object');
    expect(result).to.not.have.key('DANCE_NOW');
    expect(process.env).to.not.have.key('DANCE_NOW');
  });
});
