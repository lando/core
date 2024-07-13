'use strict';

module.exports = (format = 'fingerprint') => {
  const fingerprints = [];

  switch (process.platform) {
    case 'darwin':
      return require('mac-ca').get({format});
    case 'linux':
      const {systemCertsSync} = require('system-ca');
      for (const cert of systemCertsSync()) {
        try {
          fingerprints.push(require('./get-fingerprint')(cert));
        } catch {}
      }

      return fingerprints;
    case 'win32':
      const winCA = require('win-ca');

      for (const cert of [...winCA({generator: true, store: ['root'], format: winCA.der2.pem})]) {
        try {
          fingerprints.push(require('./get-fingerprint')(cert));
        } catch {}
      }

      return fingerprints;
  }
};
