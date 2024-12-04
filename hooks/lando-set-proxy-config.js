'use strict';

const _ = require('lodash');
const path = require('path');
const url = require('url');

const ports2Urls = (ports, secure = false, hostname = '127.0.0.1') => _(ports)
  .map(port => url.format({protocol: (secure) ? 'https' : 'http', hostname, port}))
  .value();

module.exports = async lando => {
  lando.log.verbose('building proxy config...');
  // Set some non dependent things
  const separator = lando.config.orchestratorSeparator;
  lando.config.proxyContainer = `${lando.config.proxyName}${separator}proxy${separator}1`;
  lando.config.proxyCurrentPorts = {http: lando.config.proxyHttpPort, https: lando.config.proxyHttpsPort};
  lando.config.proxyDir = path.join(lando.config.userConfRoot, 'proxy');
  lando.config.proxyHttpPorts = _.flatten([lando.config.proxyHttpPort, lando.config.proxyHttpFallbacks]);
  lando.config.proxyHttpsPorts = _.flatten([lando.config.proxyHttpsPort, lando.config.proxyHttpsFallbacks]);
  lando.config.proxyLastPorts = lando.cache.get(lando.config.proxyCache);
  lando.config.proxyNet = `${lando.config.proxyName}_edge`;
  lando.config.proxyScanHttp = ports2Urls(lando.config.proxyHttpPorts, false, lando.config.proxyBindAddress);
  lando.config.proxyScanHttps = ports2Urls(lando.config.proxyHttpsPorts, true, lando.config.proxyBindAddress);
  // And dependent things
  lando.config.proxyConfigDir = path.join(lando.config.proxyDir, 'config');
};
