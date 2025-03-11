'use strict';

// Modules.
const _ = require('lodash');
const {nanoid} = require('nanoid');
const EventEmitter = require('events').EventEmitter;
const Log = require('./logger');
const Promise = require('./promise');

/**
 * @typedef {import('./logger')} Log
 */

/**
 * @typedef {Object} EventListener
 * @property {string} name - The event name
 * @property {number} priority - Priority level for execution order
 * @property {Function} fn - Event handler function
 * @property {string} id - Unique identifier for the listener
 */

/**
 * AsyncEvents extends Node's EventEmitter to provide asynchronous event handling
 * with priority levels and promisified event emission.
 *
 * This class is used by Lando to manage asynchronous events throughout the application
 * lifecycle, particularly during bootstrap and app operations.
 *
 * @memberof module:Lando
 * @extends EventEmitter
 * @property {EventListener[]} _listeners - Internal array of registered event listeners
 * @property {Log} log - Lando logger instance
 */
class AsyncEvents extends EventEmitter {
  /**
   * Creates a new AsyncEvents instance
   *
   * @param {Log} [log] - Lando logger instance
   */
  constructor(log = new Log()) {
    // Get the event emitter stuffs
    super();
    // Set things
    this.log = log;
    /** @type {EventListener[]} */
    this._listeners = [];
  }

  /**
   * Registers an event listener with optional priority
   *
   * Lower priority numbers run first. If no priority is specified,
   * the default is 5.
   *
   * @since 3.0.0
   * @alias lando.events.on
   * @param {string} name - The event name to listen for
   * @param {number|Function} [priority=5] - Priority level or listener function
   * @param {Function} [fn] - Event listener function if priority is specified
   * @return {AsyncEvents} This AsyncEvents instance for chaining
   *
   * @example
   * // Print out all our apps as they get instantiated and do it before other `post-instantiate-app` events
   * lando.events.on('post-instantiate-app', 1, app => {
   *   console.log(app);
   * });
   *
   * // Log a helpful message after an app is started, don't worry about whether it runs before or
   * // after other `post-start` events
   * return app.events.on('post-start', () => {
   *   lando.log.info('App %s started', app.name);
   * });
   */
  on(name, priority, fn) {
    // Handle no priority
    // @todo: is there a way to get this working nicely via es6?
    if (_.isUndefined(fn) && _.isFunction(priority)) {
      fn = priority;
      priority = 5;
    }

    // Store
    this._listeners.push({name, priority, fn, id: nanoid()});
    // Log
    this.log.silly('loading event %s priority %s', name, priority);
    // Call original on method.
    return this.__on(name, fn);
  }

  /**
   * Emits an event and waits for all handlers to complete
   *
   * This makes events blocking and promisified. All event handlers
   * are executed in series based on their priority.
   *
   * @since 3.0.0
   * @alias lando.events.emit
   * @param {string} name - The event name to emit
   * @param {...*} args - Arguments to pass to event handlers
   * @return {Promise<boolean>} Resolves true if event had listeners
   *
   * @example
   * // Emit event with data
   * await events.emit('app-ready', app);
   *
   * // Emit event with multiple args
   * await events.emit('database-ready', connection, config);
   */
  emit(...args) {
    /*
     * Helper function that will always return a promise even if function is
     * synchronous and doesn't return a promise.
     * @todo: this is very old kbox code, can we update it a bit?
     */
    const handle = (...args) => {
      const fn = args.shift();
      const result = fn.apply(this, args);
      return Promise.resolve(result);
    };

    // Save for later
    const self = this;
    // Grab name of event from first argument.
    const name = args.shift();

    // Grab priority sorted listeners for this event
    const evnts = _(this._listeners)
      // Filter by name
      .filter(listener => listener.name === name)
      // Sort by priority
      .sortBy('priority')
      // Return value
      .value();

    // Map to array of func
    const fns = _.map(evnts, evnt => ({fn: evnt.fn, id: evnt.id}));

    // Log non engine events so we can keep things quiet
    this.log.debug('emitting event %s', name);
    this.log.silly('event %s has %s listeners', name, fns.length);

    // Make listener functions to a promise in series.
    return Promise.each(fns, listener => {
      const {fn, id} = listener;
      // Clone function arguments.
      const fnArgs = args.slice();
      // Add listener function to front of arguments.
      fnArgs.unshift(fn);
      // If its a onetimer then remove it from listeners
      if (fn.name && fn.name.includes('onceWrapper')) {
        this._listeners = this._listeners.filter(listener => listener.id !== id);
      }
      // Apply function that calls the listener function and returns a promise.
      return handle.apply(self, fnArgs);
    })

    // Make sure to wait for all mappings.
    .all()

    // Return true if event had listeners just like the original emit function.
    .return(!!fns.length);
  }

  /**
   * Removes all registered event listeners
   *
   * @return {void}
   */
  removeAllListeners() {
    this._listeners = [];
    super.removeAllListeners();
  }
}

/*
 * Stores the original event on method.
 *
 * I don't think you want to ever really use this. Mentioned only for transparency.
 *
 * @alias lando.events.__on
 * @see https://nodejs.org/api/events.html
 */
AsyncEvents.prototype.__on = EventEmitter.prototype.on;

/*
 * Stores the original event emit method.
 *
 * I don't think you want to ever really use this. Mentioned only for transparency.
 *
 * @alias lando.events.__emit
 * @see https://nodejs.org/api/events.html
 */
AsyncEvents.prototype.__emit = EventEmitter.prototype.emit;

// Set our maxListeners to something more reasonable for lando
AsyncEvents.prototype.setMaxListeners(64);

/**
 * The AsyncEvents class
 * @module AsyncEvents
 * @type {AsyncEvents}
 */
module.exports = AsyncEvents;
