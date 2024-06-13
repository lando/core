'use strict';

module.exports = (format = 'fingerprint') => {
  switch (process.platform) {
    case 'darwin':
      return require('mac-ca').get({format});
    case 'linux':
      return [];
    case 'windows':
      return [];
  }
};
