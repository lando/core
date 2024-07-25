'use strict';

const isObject = require('lodash/isPlainObject');
const range = require('lodash/range');

// @TODO: func to get a protocol type
// -> :PORT but handle :PORT-PORT

const getPorts = (port = {}) => {
  // map to a string for easier stuff
  if (isObject(port)) port = port.published;
  // get the correct part
  port = port.split(':')[port.split(':').length - 1];
  // cut off the protocol
  port = port.split('/')[0];
  // range me
  port = range(port.split('-')[0], parseInt(port.split('-')[1] ?? port.split('-')[0]) + 1);
  return port;
};

const getProtocolPorts = (ports = [], protocol = 'http') => {
  return ports
    .filter(port => {
      if (typeof port === 'string') return port.endsWith(`/${protocol}`);
      if (isObject(port)) return port.app_protocol === protocol;
      return false;
    })
    .map(port => getPorts(port))
    .flat(Number.POSITIVE_INFINITY);
};

module.exports = (ports = []) => {
  // get the http/https protocols
  const http = getProtocolPorts(ports, 'http');
  const https = getProtocolPorts(ports, 'https');

  // normalize http/https -> tcp
  ports = ports
    .map(port => {
      if (typeof port === 'string') {
        port = port.replace('/https', '/tcp');
        port = port.replace('/http', '/tcp');
      }
      return port;
    });

  return {http, https, ports};
};
