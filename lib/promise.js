'use strict';

/**
 * Extended Promise class that adds retry functionality to Bluebird promises
 *
 * This module extends the Bluebird promise library to add retry capabilities
 * while maintaining all standard Bluebird functionality. It configures promises
 * with long stack traces and cancellation support enabled by default.
 *
 * Note that bluebird currently wants you to use scoped prototypes to extend
 * it rather than the normal extend syntax so that is why this is using the "old"
 * way
 *
 * @module LandoPromise
 * @memberof module:Lando
 * @alias lando.Promise
 * @see {@link http://bluebirdjs.com/docs/api-reference.html|Bluebird API Reference}
 */

const Promise = require('bluebird');

// Use long stack traces and enable cancellation
Promise.config({longStackTraces: true, cancellation: true});

/**
 * Configuration options for retry functionality
 *
 * @typedef {Object} RetryOptions
 * @property {number} [max=5] - Maximum number of retry attempts
 * @property {number} [backoff=500] - Delay between retries in milliseconds (cumulative)
 */

/**
 * Retries a function multiple times until it succeeds or max attempts are reached
 *
 * @param {Function} fn - Function to retry. Receives current attempt counter as parameter
 * @param {RetryOptions} [options] - Retry configuration options
 * @return {Promise<*>} Resolves with the result of the function or rejects if max retries reached
 * @throws {Error} Throws the last error encountered if max retries are exceeded
 *
 * @example
 * // Retry a database connection 3 times with 1 second backoff
 * const connectDB = async (attempt) => {
 *   console.log(`Attempt ${attempt} to connect`);
 *   return db.connect();
 * };
 *
 * Promise.retry(connectDB, {max: 3, backoff: 1000})
 *   .then(() => console.log('Connected!'))
 *   .catch(err => console.error('Failed to connect:', err));
 */
const retry = (fn, {max = 5, backoff = 500} = {}) => Promise.resolve().then(() => {
  const rec = counter => Promise.try(() => fn(counter).catch(err => {
    if (counter <= max) {
      return Promise.delay(backoff * counter).then(() => rec(counter + 1));
    } else {
      return Promise.reject(err);
    }
  }));

  // Init recursive function
  return rec(1);
});

/**
 * Adds the retry method to the Promise constructor
 *
 * @memberof module:LandoPromise
 * @static
 */
Promise.retry = retry;

/**
 * Adds the retry method to Promise instances
 *
 * This allows both static and instance usage of the retry functionality:
 * - `Promise.retry(fn, options)`
 * - `promise.retry(fn, options)`
 *
 * @since 3.0.0
 * @alias lando.Promise.retry
 * @memberof module:LandoPromise
 * @instance
 * @function retry
 * @param {Function} fn - Function to retry
 * @param {RetryOptions} [options] - Retry configuration options
 * @return {Promise<*>} A new promise that will be resolved/rejected based on retry results
 *
 * @example
 * // Using as an instance method
 * Promise.resolve()
 *   .retry(async (attempt) => {
 *     if (attempt < 3) throw new Error('Not yet!');
 *     return 'Success!';
 *   }, {max: 3, backoff: 1000});
 */
Promise.prototype.retry = retry;

/**
 * Extended Bluebird Promise class with retry functionality
 *
 * @type {typeof Promise}
 * @exports Promise
 */
module.exports = Promise;
