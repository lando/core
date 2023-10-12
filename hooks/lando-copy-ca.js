'use strict';

module.exports = async lando => {
  const caNormalizedCert = path.join(caDir, `${caDomain}.crt`);
  if (fs.existsSync(caCert) && !fs.existsSync(caNormalizedCert)) {
    // @NOTE: we need to use pre node 8.x-isms because pld roles with node 7.9 currently
    fs.writeFileSync(caNormalizedCert, fs.readFileSync(caCert));
  }
};
