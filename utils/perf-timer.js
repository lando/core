'use strict';

/**
 * Create a performance timer.
 *
 * Returns an object with a `label` property and a `stop()` method that
 * returns the elapsed time in milliseconds (fractional) since the timer
 * was created.  Uses `process.hrtime.bigint()` for nanosecond precision.
 *
 * @param {string} label - Human-readable label for the timer.
 * @returns {{stop: function(): number, label: string}}
 * @since 4.0.0
 *
 * @example
 * const perfTimer = require('../utils/perf-timer');
 * const timer = perfTimer('container start');
 * // ... do work ...
 * const ms = timer.stop();
 * console.log(`${timer.label}: ${ms}ms`);
 */
const perfTimer = label => {
  const start = process.hrtime.bigint();
  return {
    label,
    stop: () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e6; // nanoseconds → milliseconds
    },
  };
};

module.exports = perfTimer;
