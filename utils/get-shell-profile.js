'use strict';

// @TODO: we really need to use is-elevated instead of is-root but we are ommiting for now since lando
// really cant run elevated anyway and its a bunch of extra effort to make all of this aysnc
// in Lando 4 this will need to be resolved though.
module.exports = () => {
  return require('is-root')() ? require('./get-system-shell-profile')() : require('./get-user-shell-profile')();
};
