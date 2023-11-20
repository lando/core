'use strict';

const os = require('os');

module.exports = user => {
  // set user to person running this process if its not set
  if (!user) user = os.userInfo().username;

  // differetn strokes, different folks
  switch (process.platform) {
    case 'darwin':
      return require('./is-group-member')('admin', user);
    case 'linux':
      return require('./is-group-member')('sudo', user);
    case 'win32':
      return require('./is-group-member')('administrators', user);
    default:
      return false;
  }
};
