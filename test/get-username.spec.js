/**
 * Tests for user module.
 * @file user.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const getUsername = require('../utils/get-username');

// @todo: we need to actually stub out shell-exec because this relies on OS specific things like `id`
describe('get-username', () => {
  it('should return a string', () => {
    const username = getUsername();
    expect(username).to.be.a('string');
    expect(username).to.not.be.empty;
  });
});
