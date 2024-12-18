'use strict';

const fs = require('fs');
const path = require('path');
const isStringy = require('../../utils/is-stringy');

const {nanoid} = require('nanoid');

module.exports = async (service, security) => {
  // right now this is mostly just CA setup, lets munge it all together and normalize and whatever
  const cas = [security.ca, security.cas, security['certificate-authority'], security['certificate-authorities']]
    .flat(Number.POSITIVE_INFINITY)
    .filter(cert => isStringy(cert))
    .map(cert => {
      // if ImportString then just return the filename
      if (cert?.constructor?.name === 'ImportString') {
        const {file} = cert.getMetadata();
        cert = file;
      }

      // if a single liner then resolve the path
      if (cert.split('\n').length === 1) {
        cert = path.resolve(service.appRoot, cert);
      }

      return cert;
    })
    .filter(cert => cert.split('\n').length > 1 || fs.existsSync(cert));

  // add ca-cert install hook if we have some to add
  if (cas.length > 0) {
    service.addHookFile(path.join(__dirname, 'install-ca-certs.sh'), {hook: 'boot'});
  }

  // inject them
  for (const ca of cas) {
    const file = ca.split('\n').length > 1 ? `LandoCA-${nanoid()}.crt` : path.basename(ca);
    service.addLSF(ca, `ca-certificates/${file}`);
  }
};
