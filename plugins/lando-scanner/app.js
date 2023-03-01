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
  .then(response => {
    response.lando = {code: _.get(response, 'status', 'unknown'), text: _.get(response, 'statusText', 'unknown')};
    log('scan of %o passed with %o %o', `${baseURL}${path}`, response.lando.code, response.lando.text);
    return response;
  })
  .catch(error => {
    // get teh response from the error
    const {response} = error;
    // standardize for lando, first try to get http code
    error.lando = {code: _.get(response, 'status', 'unknown'), text: _.get(response, 'statusText', 'unknown')};
    // if its unknown then try a few other scenarios eg timeout
    if (error.lando.code === 'unknown' && _.startsWith(error.message, 'timeout')) error.lando.code = 'TIMEOUT';
    // if still unknown try to grab the code
    if (error.lando.code === 'unknown') error.lando.code = _.get(error, 'code', 'unknown');

    // if an OK code then also pass
    if (_.includes(okCodes, error.lando.code)) {
      log('scan of %o passed with ok code', `${baseURL}${path}`, error.lando.code);
      return {lando: error.lando};
    }

    // if we get here then debug full error?
    log('scan of %o failed with %o %o', `${baseURL}${path}`, error.lando.code, error.lando.text);

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
          retry: _.get(app, `config.services.${service.service}.scanner.retry`, 25),
          skip: _.get(app, `config.services.${service.service}.scanner`) === false || _.includes(url, '*'),
          title: url,
          args: [url, {
            okCodes: _.get(app, `config.services.${service.service}.scanner.okCodes`, []),
            timeout: _.get(app, `config.services.${service.service}.scanner.timeout`, 10000),
            log: app.log.debug,
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
