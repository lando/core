/**
 * Tests for config system.
 * @file config.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const loadEnvs = require('../utils/load-env');

describe('load-env', () => {
  it('should return an object built from all keys from process.env that start with a given prefix', () => {
    process.env.DANCE_NOW = 'everybody';
    const result = loadEnvs('DANCE');
    expect(result).to.be.an('object');
    expect(result).to.have.key('now');
    expect(result.now).to.equal(process.env.DANCE_NOW);
  });
});
