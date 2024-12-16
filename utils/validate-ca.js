'use strict';

const forge = require('node-forge');
const read = require('./read-file');

module.exports = (cert, key, {
  debug = require('debug')('@lando/validate-script'),
} = {}) => {
  try {
    cert = forge.pki.certificateFromPem(read(cert));
    key = forge.pki.privateKeyFromPem(read(key));

    // verify the signature using the public key in the CA certificate
    const md = forge.md.sha256.create();
    md.update('taanab', 'utf8');
    const signature = key.sign(md);

    // if they dont match then throw
    if (!cert.publicKey.verify(md.digest().bytes(), signature)) {
      debug('CA and its private key do not match');
      return false;
    }

    // otherwise we are good
    return true;
  } catch (error) {
    debug('something is wrong with the CA %o', error.message);
    debug('%o', error);
    return false;
  }
};
