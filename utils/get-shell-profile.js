'use strict';

module.exports = () => {
  return require('is-root')() ? require('./get-global-shell-profile')() : require('./get-user-shell-profile')();
};
