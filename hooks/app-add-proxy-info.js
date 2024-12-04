'use strict';

const _ = require('lodash');
const parseUrl = require('../utils/parse-proxy-url');

const hasCerts = (app, id) => {
  const info = app.info.find(service => service.service === id);
  const v4 = _.get(app, 'v4.services', []).find(service => service.id === id);
  return info?.hasCerts === true || (v4?.certs !== undefined && v4?.certs !== false);
};

/*
 * Helper to get URLs for app info and scanning purposes
 */
const getInfoUrls = (url, ports, hasCerts = false) => {
  // Start with the default
  const urls = [`http://${url.host}${ports.http === '80' ? '' : `:${ports.http}`}${url.pathname}`];
  // Add https if we can
  if (hasCerts) {
    urls.push(`https://${url.host}${ports.https === '443' ? '' : `:${ports.https}`}${url.pathname}`);
  }
  // Return
  return urls;
};

/*
 * Parse config into urls we can merge to app.info
 */
const parse2Info = (urls, ports, hasCerts = false) => _(urls)
  .map(url => parseUrl(url))
  .flatMap(url => getInfoUrls(url, ports, hasCerts))
  .value();


module.exports = async (app, lando) => {
  // Only do things if the proxy is enabled
  if (lando.config.proxy === 'ON' && (!_.isEmpty(app.config.proxy) || !_.isEmpty(app.config.recipe))) {
    // Get last known ports
    const ports = lando.cache.get(lando.config.proxyCache);
    // Map to protocol and add portz
    // @TODO: do something more meaningful below like logging?, obviously starting to not GAS
    if (ports) {
      _(app.info)
        .filter(service => _.has(app, `config.proxy.${service.service}`))
        .flatMap(s => s.urls = _.uniq(s.urls.concat(parse2Info(
          app.config.proxy[s.service],
          ports,
          hasCerts(app, s.service),
        ))))
        .value();
    }
  }
};
