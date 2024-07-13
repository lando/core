'use strict';

const fs = require('fs');
const forge = require('node-forge');
const read = require('./read-file');

module.exports = (input, sha = 'sha1') => {
  const contents = (fs.existsSync(input)) ? read(input) : input;
  const cert = forge.pki.certificateFromPem(contents);
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const md = forge.md[sha].create();
  md.update(der);
  return md.digest().toHex();
};
