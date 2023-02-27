'use strict';

// Modules
const _ = require('lodash');
const debug = require('debug')('@lando/core:scanner');
const https = require('https');

const request = () => {
  const axios = require('axios');
  // @todo: is it ok to turn redirects off here?
  // if we don't we get an error every time http tries to redirect to https
  return axios.create({maxRedirects: 3, httpsAgent: new https.Agent({rejectUnauthorized: false})});
};

// @TODO: add some debugging? or only in CLI?
const scan = (baseURL, {okCodes = [], log = debug, path = '/', timeout = 3000} = {}) => request()
  .get(path, {baseURL, timeout})
  .catch(error => {
    // standardize for lando, first try to get http code
    error.lando = {code: _.get(error, 'response.status', 'unknown')};
    // if an OK code then also pass
    if (_.includes(okCodes, error.lando.code)) return;
    // if its unknown then try a few other scenarios eg timeout
    if (error.lando.code === 'unknown' && _.startsWith(error.message, 'timeout')) error.lando.code = 'TIMEOUT';
    // if still unknown try to grab the code
    if (error.lando.code === 'unknown') error.lando.code = _.get(error, 'code', 'unknown');
    // throw
    throw error;
  });

module.exports = async (app, lando) => {
  // ensure that checks exists and is an array
  app.events.on('post-init', () => {
    if (!_.isArray(app.checks)) app.checks = [];
  });


  // Add URL scan checks
  app.events.on('post-start', 10, () => {
    // get checks for each URL
    const checks = _(app.info)
      .filter(service => !_.isEmpty(service.urls))
      .flatMap(service => _(service.urls)
        .map(url => ({
          type: 'url-scan',
          events: ['start', 'restart', 'rebuild'],
          test: scan,
          service: service.service,
          max: _.get(app, `config.services.${service.service}.scanner.max`, 25),
          skip: _.get(app, `config.services.${service.service}.scanner`) === false,
          args: [url, {
            okCode: _.get(app, `config.services.${service.service}.scanner.okCodes`, []),
            timeout: _.get(app, `config.services.${service.service}.scanner.timeout`, 10000),
            log: lando.log.verbose,
            path: _.get(app, `config.services.${service.service}.scanner.path`, '/'),
          }],
        }))
        .value(),
      )
      .value();

    // combine our checks into app.checks
    app.checks = [...app.checks, ...checks].filter(Boolean);
  });
};
