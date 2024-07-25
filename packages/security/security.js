'use strict';

const fs = require('fs');
const path = require('path');

module.exports = async (service, security) => {
  // right now this is mostly just CA setup, lets munge it all together and normalize and whatever
  const cas = [security.ca, security.cas, security['certificate-authority'], security['certificate-authorities']]
    .flat(Number.POSITIVE_INFINITY)
    .filter(cert => fs.existsSync(cert))
    .map(cert => path.isAbsolute(cert) ? cert : path.resolve(service.appRoot, cert));

  // add ca-cert install hook if we have some to add
  if (cas.length > 0) {
    service.addHookFile(path.join(__dirname, 'install-ca-certs.sh'), {hook: 'boot'});
  }

  // inject them
  for (const ca of cas) service.addLSF(ca, `ca-certificates/${path.basename(ca)}`);
};
