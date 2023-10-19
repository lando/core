/**
 * Tests for user module.
 * @file user.spec.js
 */

'use strict';

const chai = require('chai');
chai.should();

const user = require('./../lib/user');

// @todo: we need to actually stub out shell-exec because this relies on OS specific things like `id`
describe('user', () => {
  describe('#getUid', () => {
    it('should return a uid', () => {
      const uid = user.getUid();
      uid.should.be.a('string');
    });
  });
  describe('#getGid', () => {
    it('should return a gid', () => {
      const gid = user.getGid();
      gid.should.be.a('string');
    });
  });
  describe('#getUsername', () => {
    it('should return a username', () => {
      const username = user.getUsername();
      username.should.be.a('string');
    });
  });
});
