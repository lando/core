/*
 * Tests for get-setup-engine.
 */

'use strict';

const chai = require('chai');
chai.should();

const getSetupEngine = require('../utils/get-setup-engine');

describe('get-setup-engine', () => {
  it('prefers explicit config engine', () => {
    const lando = {
      cache: {get: () => 'docker'},
      config: {engine: 'containerd'},
    };

    getSetupEngine(lando).should.equal('containerd');
  });

  it('falls back to cached engine selection', () => {
    const lando = {
      cache: {get: () => 'containerd'},
      config: {engine: 'auto'},
    };

    getSetupEngine(lando).should.equal('containerd');
  });
});
