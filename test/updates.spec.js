/**
 * Tests for updates module.
 * @file updates.spec.js
 */

'use strict';

const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
chai.should();

const UpdateManager = require('./../lib/updates');
const updates = new UpdateManager();

describe('updates', () => {
  describe('#updateAvailable', () => {
    it('should return true if version 1 is less than version 2', () => {
      updates.updateAvailable('3.0.0', '3.0.1').should.be.true;
      updates.updateAvailable('3.0.1', '3.0.1').should.be.false;
    });

    it('should handle non-numeric eg "beta" versions', () => {
      updates.updateAvailable('3.0.0-beta.1', '3.0.0-beta.2').should.be.true;
      updates.updateAvailable('3.0.0-beta.2', '3.0.0-beta.2').should.be.false;
    });

    it('should understand the prerelease hierarchy', () => {
      updates.updateAvailable('3.0.0-alpha.1', '3.0.0-beta.1').should.be.true;
      updates.updateAvailable('3.0.0-alpha.1', '3.0.0-rc.1').should.be.true;
      updates.updateAvailable('3.0.0-alpha.1', '3.0.0-rrc.1').should.be.true;
      updates.updateAvailable('3.0.0-beta.1', '3.0.0-rc.1').should.be.true;
      updates.updateAvailable('3.0.0-rc.1', '3.0.0-rrc.1').should.be.true;
      updates.updateAvailable('3.0.0-beta.1', '3.0.0-rrc.1').should.be.true;

      updates.updateAvailable('3.0.0-rrc.1', '3.0.0-alpha.1').should.be.false;
      updates.updateAvailable('3.0.0-rrc.1', '3.0.0-beta.1').should.be.false;
      updates.updateAvailable('3.0.0-rrc.1', '3.0.0-rc.1').should.be.false;
      updates.updateAvailable('3.0.0-beta.1', '3.0.0-alpha.1').should.be.false;
      updates.updateAvailable('3.0.0-rc.1', '3.0.0-alpha.1').should.be.false;
      updates.updateAvailable('3.0.0-rc.1', '3.0.0-beta.1').should.be.false;
    });
  });

  describe('#fetch', () => {
    it('should return true if data is undefined', () => {
      updates.fetch().should.be.true;
    });

    it('should return whether we need to check for updates again', () => {
      // Accelerate to 88mph 💥 🚗 🔥🔥🔥🔥
      const clock = sinon.useFakeTimers(new Date('October 26, 1985 01:35:00'));
      // Old Man Peabody
      updates.fetch({expires: new Date('November 5, 1955, 06:15:00')}).should.be.true;
      // Where we're going, we don't need roads
      updates.fetch({expires: new Date('October 21, 2015, 16:29:00')}).should.be.false;
      // Back to the future
      clock.restore();
    });
  });
});
