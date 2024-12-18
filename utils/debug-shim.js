'use strict';

const _debug = require('debug');

const Log = require('./../lib/logger');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (log, {namespace} = {}) => {
  const fresh = new Log({...log.shim, extra: namespace});

  // add sanitization
  fresh.alsoSanitize(/_auth$/);
  fresh.alsoSanitize(/_authToken$/);
  fresh.alsoSanitize(/_password$/);
  fresh.alsoSanitize('forceAuth');

  // spoofer
  const spoofer = _debug(namespace ?? 'lando');
  spoofer.diff = 0;

  // we need to start with the function itself and then augment it
  const debug = (...args) => {
    args[0] = _debug.coerce(args[0]);

    if (typeof args[0] !== 'string') args.unshift('%O');

    // Apply any `formatters` transformations
    let index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
      // If we encounter an escaped % then don't increase the array index
      if (match === '%%') {
        return '%';
      }
      index++;
      const formatter = _debug.formatters[format];
      if (typeof formatter === 'function') {
        const val = args[index];
        match = formatter.call(spoofer, val);

        args.splice(index, 1);
        index--;
      }
      return match;
    });

    fresh.debug(...args);
  };

  // contract and replace should do nothing
  debug.contract = () => debug;
  debug.replace = () => debug;
  // extend should just return a new logger
  debug.extend = name => module.exports(log, {namespace: name});

  return debug;
};
