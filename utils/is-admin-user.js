'use strict';

const os = require('os');

module.exports = (user, {platform = process.platform} = {}) => {
  // set user to person running this process if its not set
  if (!user) user = os.userInfo().username;

  // differetn strokes, different folks
  switch (platform) {
    case 'darwin':
      return require('./is-group-member')('admin', user, platform);
    case 'linux':
      return require('./is-group-member')('sudo', user, platform)
        || require('./is-group-member')('admin', user, platform)
        || require('./is-group-member')('wheel', user, platform)
        || require('./is-group-member')('adm', user, platform);
    case 'win32':
      return require('./is-group-member')('S-1-5-32-544', user, platform)
        || require('./is-group-member')('administrators', user, platform);
    default:
      return false;
  }
};
