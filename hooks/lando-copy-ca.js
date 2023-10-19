'use strict';

const fs = require('fs');
const path = require('path');

module.exports = async (lando, {caCert, caDir, caDomain}) => {
  const caNormalizedCert = path.join(caDir, `${caDomain}.crt`);
  if (fs.existsSync(caCert) && !fs.existsSync(caNormalizedCert)) {
    // @NOTE: we need to use pre node 8.x-isms because pld roles with node 7.9 currently
    fs.writeFileSync(caNormalizedCert, fs.readFileSync(caCert));
  }
};
