/*
 * Tests for the landonet setup hook.
 * @file lando-setup-landonet.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;

const Log = require('../lib/logger');

describe('lando-setup-landonet', () => {
  const daemonPath = require.resolve('../lib/daemon');

  // live-tested: this task built its own daemon without the provider, so auto picked Docker Desktop and relaunched it
  it('should start the configured engine provider, not Docker Desktop', async () => {
    require('../lib/daemon');
    const original = require.cache[daemonPath].exports;
    const constructed = [];
    require.cache[daemonPath].exports = class {
      constructor(...args) {
        constructed.push(args);
      }
      async up() {
        throw new Error('stop here');
      }
    };

    try {
      const hook = require('../hooks/lando-setup-landonet');
      const options = {tasks: []};
      const lando = {config: {os: {landoPlatform: 'darwin'}, engineProvider: 'orbstack'}, log: new Log()};
      await hook(lando, options);
      await options.tasks[0].task({}, {}).catch(() => {});
      expect(constructed).to.have.lengthOf(1);
      expect(constructed[0][8]).to.equal('orbstack');
    } finally {
      require.cache[daemonPath].exports = original;
    }
  });
});
