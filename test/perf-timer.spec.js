/*
 * Tests for perf-timer.
 * @file perf-timer.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const perfTimer = require('./../utils/perf-timer');

describe('perf-timer', () => {
  describe('#return value', () => {
    it('should return an object with label and stop function', () => {
      const timer = perfTimer('test');
      expect(timer).to.be.an('object');
      expect(timer).to.have.property('label');
      expect(timer).to.have.property('stop');
      timer.stop.should.be.a('function');
    });

    it('should have label matching what was passed in', () => {
      const timer = perfTimer('my-operation');
      timer.label.should.equal('my-operation');
    });

    it('should preserve empty string label', () => {
      const timer = perfTimer('');
      timer.label.should.equal('');
    });
  });

  describe('#stop()', () => {
    it('should return a number (milliseconds)', () => {
      const timer = perfTimer('test');
      const elapsed = timer.stop();
      elapsed.should.be.a('number');
    });

    it('should return elapsed time >= 0', () => {
      const timer = perfTimer('test');
      const elapsed = timer.stop();
      elapsed.should.be.at.least(0);
    });

    it('should measure real elapsed time', function(done) {
      this.timeout(5000);
      const timer = perfTimer('sleep-test');
      setTimeout(() => {
        const elapsed = timer.stop();
        elapsed.should.be.at.least(50);
        done();
      }, 55); // sleep slightly over 50ms to account for timer granularity
    });

    it('should be callable multiple times returning increasing values', function(done) {
      this.timeout(5000);
      const timer = perfTimer('multi-stop');
      const first = timer.stop();
      setTimeout(() => {
        const second = timer.stop();
        second.should.be.at.least(first);
        done();
      }, 20);
    });
  });

  describe('#multiple timers', () => {
    it('should not interfere with each other', function(done) {
      this.timeout(5000);
      const timerA = perfTimer('timer-a');

      setTimeout(() => {
        const timerB = perfTimer('timer-b');

        setTimeout(() => {
          const elapsedA = timerA.stop();
          const elapsedB = timerB.stop();

          // timerA was started ~60ms before timerB, so it should show more elapsed time
          elapsedA.should.be.at.least(50);
          elapsedB.should.be.at.least(25);
          elapsedA.should.be.greaterThan(elapsedB);

          // Labels should remain independent
          timerA.label.should.equal('timer-a');
          timerB.label.should.equal('timer-b');

          done();
        }, 30);
      }, 30);
    });

    it('should track separate start times', () => {
      const timers = [];
      for (let i = 0; i < 5; i++) {
        timers.push(perfTimer(`timer-${i}`));
      }

      // All timers should return non-negative elapsed times
      const results = timers.map(t => t.stop());
      results.forEach(elapsed => {
        elapsed.should.be.a('number');
        elapsed.should.be.at.least(0);
      });

      // Labels should be correct
      timers.forEach((t, i) => {
        t.label.should.equal(`timer-${i}`);
      });
    });
  });
});
