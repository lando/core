'use strict';

const _ = require('lodash');

const parseUrls = (urls = []) => {
  return urls.map(url => {
    try {
      url = new URL(url);
      return url.hostname;
    } catch {
      return undefined;
    }
  })
  .filter(hostname => hostname !== undefined);
};

module.exports = async (app, lando) => {
  const certServices = app.info
    .filter(service => service.hasCerts === true)
    .map(service => ({
      name: `${service.service}.${app.project}`,
      domains: _.uniq([...parseUrls(service.urls), ...service.hostnames, service.service]),
    }));

  // and then run them in parallel
  await Promise.all(certServices.map(async ({name, domains}) => {
    await lando.generateCert(name, {domains});
  }));
};
