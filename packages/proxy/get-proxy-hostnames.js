'use strict';

// @TODO: move this into utils and reuse in app-generate-certs.js?
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

module.exports = (routes = []) => parseUrls(routes
  .map(route => route?.hostname ?? route?.host ?? route)
  .map(route => `http://${route}`));
