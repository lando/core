'use strict';

const Log = require('./../lib/logger');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (log, {namespace} = {}) => {
  const fresh = new Log({...log.shim, extra: namespace});

  // add sanitization
  fresh.alsoSanitize(/_auth$/);
  fresh.alsoSanitize(/_authToken$/);
  fresh.alsoSanitize(/_password$/);
  fresh.alsoSanitize('forceAuth');

  // we need to start with the function itself and then augment it
  const debug = fresh.debug;
  // contract and replace should do nothing
  debug.contract = () => fresh.debug;
  debug.replace = () => fresh.debug;
  // extend should just return a new logger
  debug.extend = name => module.exports(log, {namespace: name});

  return debug;
};
