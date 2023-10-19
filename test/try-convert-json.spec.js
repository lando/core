/**
 * Tests for config system.
 * @file config.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const tryConvertJson = require('../utils/try-convert-json');

describe('try-convert-json', () => {
  it('should return the unaltered input if input is not a parsable JSON string', () => {
    const input = 'obiwan';
    const result = tryConvertJson(input);
    expect(result).to.be.a('string');
    expect(result).to.equal(input);
  });

  it('should return an object if input is a parsable JSON string representing an object', () => {
    const input = '{}';
    const result = tryConvertJson(input);
    expect(result).to.be.an('object');
  });

  it('should return an array if input is a parsable JSON string representing an array', () => {
    const input = '[]';
    const result = tryConvertJson(input);
    expect(result).to.be.an('array');
  });
});

