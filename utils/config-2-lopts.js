'use strict';

/*
 * brief wrapper to accomodate lando 3 conventions when using lando 4 plugin fetching
 */
module.exports = (config = {}, auth = [], scope = []) => {
  // if auth if a string hing push directly
  if (typeof config.auth === 'string') auth.push(config.auth);

  // if either regsitry of scope is a strinbg then just push
  if (typeof config.registry === 'string') scope.push(config.registry);
  else if (typeof config.scope === 'string') scope.push(config.scope);

  // if auth is  an object then arrify
  if (typeof config.auth === 'object' && config.auth !== null) {
    for (const [key, value] of Object.entries(config.auth)) auth.push(`${key}=${value}`);
  }

  // ditto for scop/registry
  ['registry', 'scope'].forEach(part => {
    if (typeof config[part] === 'object' && config[part] !== null) {
      for (const [key, value] of Object.entries(config[part])) scope.push(`${key}=${value}`);
    }
  });

  return {auth, scope};
};
