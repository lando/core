'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const getUser = require('../utils/get-user');

describe('get-user', function() {
  let sandbox;

  beforeEach(function() {
    // Create a sinon sandbox to restore stubs/spies after each test
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    // Restore the sandbox back to its original state
    sandbox.restore();
  });

  it('should return "www-data" if no matching service is found', function() {
    const info = [{service: 'not-matching'}];
    expect(getUser('test-service', info)).to.equal('www-data');
  });

  it('should return "www-data" for a "no-api" docker-compose service', function() {
    const info = [{service: 'test-service', type: 'docker-compose'}];
    expect(getUser('test-service', info)).to.equal('www-data');
  });

  it('should return "www-data" if service.api is 4 but no user is specified', function() {
    const info = [{service: 'test-service', api: 4}];
    expect(getUser('test-service', info)).to.equal('www-data');
  });

  it('should return specified user if service.api is 4 and user is specified', function() {
    const info = [{service: 'test-service', api: 4, user: 'custom-user'}];
    expect(getUser('test-service', info)).to.equal('custom-user');
  });

  it('should return "www-data" if service.api is not 4 and no meUser is specified', function() {
    const info = [{service: 'test-service', api: 3}];
    expect(getUser('test-service', info)).to.equal('www-data');
  });

  it('should return specified meUser if service.api is not 4 and meUser is specified', function() {
    const info = [{service: 'test-service', api: 3, meUser: 'custom-meUser'}];
    expect(getUser('test-service', info)).to.equal('custom-meUser');
  });
});
