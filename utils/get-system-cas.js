'use strict';

module.exports = (format = 'fingerprint') => {
  switch (process.platform) {
    case 'darwin':
      return require('mac-ca').get({format});
    case 'linux':
      return [];
    case 'win32':
      const winCA = require('win-ca');
      const fingerprints = [];

      for (const cert of [...winCA({generator: true, store: ['root'], format: winCA.der2.pem})]) {
        try {
          fingerprints.push(require('./get-fingerprint')(cert));
        } catch {}
      }

      return fingerprints;
  }
};
