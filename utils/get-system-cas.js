'use strict';

const os = require('os');

/*
 * Retrieves system Certificate Authority (CA) certificates based on the current platform.
 *
 * This function handles different platforms (macOS, Linux, Windows) and returns
 * the system CA certificates in the specified format. It uses platform-specific
 * libraries to fetch the certificates and processes them as needed.
 *
 * @param {string} [format='fingerprint'] - The desired format for the certificates.
 *                                          Default is 'fingerprint'.
 * @return {Array|Object} An array of certificate fingerprints (for Linux and Windows)
 *                         or an object containing certificates (for macOS).
 *
 * @throws {Error} May throw errors during certificate processing, which are logged
 *                 to the console but do not interrupt the function's execution.
 */
module.exports = async ({
  format = 'fingerprint',
  platform = process.landoPlatform ?? process.platform,
}= {}) => {
  const fingerprints = [];

  switch (platform) {
    case 'darwin':
      // For macOS, we use the 'mac-ca' library which handles the formatting
      return require('mac-ca').get({format});

    case 'linux': {
      // For Linux, we use the 'system-ca' library to get system certificates
      const {systemCertsAsync} = require('system-ca');
      for (const cert of await systemCertsAsync()) {
        try {
          fingerprints.push(require('./get-fingerprint')(cert));
        } catch {
          // This is a noop because we dont care if a cert fails to process
          // when it's not our CA.
        }
      }

      return fingerprints;
    }
    case 'win32': {
      // For Windows, we use the 'win-ca' library to fetch root certificates
      const winCA = require('win-ca');

      for (const cert of [...winCA({generator: true, store: ['root'], format: winCA.der2.pem})]) {
        try {
          fingerprints.push(require('./get-fingerprint')(cert));
        } catch {
          // This is a noop because we dont care if a cert fails to process
          // when it's not our CA.
        }
      }

      return fingerprints;
    }
    case 'wsl': {
      const {stdout} = await require('./run-command')(
        'powershell.exe',
        ['-Command', 'Get-ChildItem -Path Cert:\\CurrentUser\\Root | Select-Object -ExpandProperty Thumbprint'],
      );

      fingerprints.push(...stdout
        .split(os.EOL)
        .map(fingerprint => fingerprint.trim())
        .map(fingerprint => fingerprint.toLowerCase())
        .filter(fingerprint => fingerprint && fingerprint !== ''));

      return fingerprints;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};
