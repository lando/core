'use strict';

const _ = require('lodash');
const url = require('url');

module.exports = (data, scan = ['80', '443'], secured = ['443'], bindAddress = '127.0.0.1') => {
  return _(_.merge(_.get(data, 'Config.ExposedPorts', []), {'443/tcp': {}}))
  .map((value, port) => ({
    port: _.head(port.split('/')),
    protocol: (_.includes(secured, port.split('/')[0])) ? 'https' : 'http'}
  ))
  .filter(exposed => _.includes(scan, exposed.port))
  .flatMap(ports => _.map(_.get(data, `NetworkSettings.Ports.${ports.port}/tcp`, []), i => _.merge({}, ports, i)))
  .filter(ports => _.includes([bindAddress, '0.0.0.0'], ports.HostIp))
  .map(ports => url.format({
    protocol: ports.protocol,
    hostname: 'localhost',
    port: _.includes(scan, ports.port) ? ports.HostPort : '',
  }))
  .thru(urls => ({service: data.Config.Labels['com.docker.compose.service'], urls}))
  .value();
};
