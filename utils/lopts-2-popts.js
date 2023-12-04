'use strict';

const parseND = require('./parse-nerfdart');

/*
 * brief wrapper to accomodate lando 3 conventions when using lando 4 plugin fetching
 */
module.exports = (options = {}, popts = {}) => {
  // if we only have one registry/scope and its global then set registry
  if (options.registry && options.registry.length === 1 && options.registry[0].split('=').length === 1) {
    popts.registry = options.registry[0];
  } else if (options.scope && options.scope.length === 1 && options.scope[0].split('=').length === 1) {
    popts.registry = options.scope[0];

  // otherwise loop through the scopes and set them correctly
  } else {
    for (const scope of options.scope) {
      // get key and value
      const key = scope.split('=')[0];
      const value = scope.split('=')[1];

      // get org scope amd strip @ so we can handle both @ and non-@ scopes downstream
      const org = key.split(':')[0].replace('@', '');
      // determine the scope key, usually this is just the assumed to be the registry
      const skey = key.split(':')[1] || 'registry';

      // set
      popts[`@${org}:${skey}`] = value;
    }
  }

  // if we only have one auth and its not scoped then set forceAuth with assumed token
  if (options.auth && options.auth.length === 1 && options.auth[0].split('=').length === 1) {
    popts.forceAuth = {'_authToken': options.auth[0]};

  // otherwise loops through the auths and set them correctly
  } else {
    for (const auth of options.auth) {
      // get key and value and key parts
      let key = auth.split('=')[0];
      const value = auth.split('=')[1];

      // start by trying to translate org scopes into registry urls
      if (popts[`@${key.split(':')[0].replace('@', '')}:registry`]) {
        const url = popts[`@${key.split(':')[0].replace('@', '')}:registry`];
        const pathname = key.split(':')[1] || '_authToken';
        const {registry, method} = parseND(`${url}/${pathname}`);
        key = `${registry}${method}`;
      }

      // then parse key into nerfdart component pieces and fill defaults if needed
      const {registry, method} = parseND(key);
      // and set
      popts[`${registry}:${method}`] = value;
    }
  }

  return popts;
};
