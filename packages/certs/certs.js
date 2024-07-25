'use strict';

const isObject = require('lodash/isPlainObject');
const path = require('path');
const uniq = require('lodash/uniq');

module.exports = async (service, certs) => {
  // if cert is true then just map to the usual
  if (certs === true) certs = '/etc/lando/certs/cert.crt';

  // if cert is a string then compute the key and objectify
  if (typeof certs === 'string') certs = {cert: certs};

  // if cert is an object with no key then compute the key with the cert
  if (isObject(certs) && certs?.key === undefined) {
    certs.key = path.posix.join(path.dirname(certs.cert), 'cert.key');
  }

  // make sure both cert and key are arrays
  if (typeof certs?.cert === 'string') certs.cert = [certs.cert];
  if (typeof certs?.key === 'string') certs.key = [certs.key];

  // generate certs
  const {certPath, keyPath} = await service.generateCert(`${service.id}.${service.project}`, {
    domains: [
      ...service.packages?.proxy?.domains ?? [],
      ...service.hostnames,
      service.id,
    ],
  });

  // build the volumes
  const volumes = uniq([
    ...certs.cert.map(file => `${certPath}:${file}`),
    ...certs.key.map(file => `${keyPath}:${file}`),
    `${certPath}:/etc/lando/certs/cert.crt`,
    `${keyPath}:/etc/lando/certs/cert.key`,
  ]);

  // add things
  service.addLandoServiceData({
    volumes,
    environment: {
      LANDO_SERVICE_CERT: certs.cert[0],
      LANDO_SERVICE_KEY: certs.key[0],
    },
  });
};
