'use strict';

const fs = require('fs');
const forge = require('node-forge');
const read = require('./read-file');

/**
 * Get the fingerprint of the certificate
 * @param {string} input - Path to certificate file or PEM-encoded certificate string
 * @param {string} [sha='sha1'] - Hash algorithm to use
 * @return {string} Fingerprint of the certificate
 */
module.exports = (input, sha = 'sha1') => {
  // Read file contents if input is a file path, otherwise use input as is
  const contents = fs.existsSync(input) ? read(input) : input;

  // Try to parse the certificate
  const cert = forge.pki.certificateFromPem(contents);

  // Convert certificate to DER format
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();

  // Calculate fingerprint
  const md = forge.md[sha].create();
  md.update(der);
  const fingerprint = md.digest().toHex();

  return fingerprint;
};
