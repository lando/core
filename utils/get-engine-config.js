'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const url = require('url');

const setDockerHost = (hostname, port = 2376) => url.format({
  protocol: 'tcp',
  slashes: true,
  hostname,
  port,
});

module.exports = ({engineConfig = {}, env = {}}) => {
  // Set defaults if we have to
  if (_.isEmpty(engineConfig)) {
    engineConfig = {
      socketPath: (process.platform === 'win32') ? '//./pipe/docker_engine' : '/var/run/docker.sock',
      host: '127.0.0.1',
      port: 2376,
    };
  }
  // Set the docker host if its non-standard
  if (engineConfig.host !== '127.0.0.1') env.DOCKER_HOST = setDockerHost(engineConfig.host, engineConfig.port);
  // Set the TLS/cert things if needed
  if (_.has(engineConfig, 'certPath')) {
    env.DOCKER_CERT_PATH = engineConfig.certPath;
    env.DOCKER_TLS_VERIFY = 1;
    env.DOCKER_BUILDKIT = 1;
    engineConfig.ca = fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'ca.pem'));
    engineConfig.cert = fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'cert.pem'));
    engineConfig.key = fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'key.pem'));
  }
  // Return
  return engineConfig;
};
