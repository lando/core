/*
 * Tests for lando-services:utils.
 * @file utils.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

// Get env module to test
const getHostPath = require('../utils/get-host-path');

// This is the file we are testing
describe('get-host-path', () => {
  it('should return the correct host path on posix', () => {
    const hostPath = getHostPath('/thing:/stuff');
    expect(hostPath).to.equal('/thing');
  });
  it('should return the correct host path on windoze', () => {
    const hostPath = getHostPath('C:\\thing:/stuff');
    expect(hostPath).to.equal('C:\\thing');
  });
});
