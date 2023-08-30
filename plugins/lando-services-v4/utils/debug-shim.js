'use strict';

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = log => {
  const debug = log.debug;
  const fs = log.filters.length;

  // add sanitization
  // @NOTE: is this really needed?
  log.alsoSanitize(/_auth$/);
  log.alsoSanitize(/_authToken$/);
  log.alsoSanitize(/_password$/);
  log.alsoSanitize('forceAuth');

  // rework debug funcs so they clear fitlers
  ['error', 'warn', 'info', 'verbose', 'debug', 'silly'].forEach(type => {
    // save the old logger
    const logger = log[type];
    log[type] = (...args) => {
      if (log.filters.length > fs) log.filters.pop();
      logger(...args);
    };
  });

  // contract and replace should do nothing
  log.debug.contract = () => log.debug;
  log.debug.replace = () => log.debug;

  // extend should add a rewrite rule to replace DEBUG with the extended name?
  log.debug.extend = name => {
    if (log.filters.length === fs) log.filters.push((level, msg) => `${name} ${msg}`);
    return debug;
  };

  return log.debug;
};
