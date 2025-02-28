'use strict';

const _ = require('lodash');
const debug = require('debug')('@lando/core:scanner');
const getAxios = require('./get-axios');

const request = (maxRedirects = 0) => getAxios({maxRedirects}, {}, {rejectUnauthorized: false});

module.exports = (baseURL, {okCodes = [], maxRedirects = 0, log = debug, path = '/', timeout = 3000} = {}) => {
  return request(maxRedirects).get(path, {baseURL, timeout})
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
};
