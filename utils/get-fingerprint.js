'use strict';

const forge = require('node-forge');
const read = require('./read-file');

module.exports = (file, sha = 'sha1') => {
  const cert = forge.pki.certificateFromPem(read(file));
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const hash = forge.md[sha].create();
  hash.update(certDer);
  return hash.digest().toHex();
};
