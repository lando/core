'use strict';

// Modules
const _ = require('lodash');
const debug = require('debug')('@lando/core:scanner');
const http = require('http');
const https = require('https');

const request = (maxRedirects = 0) => {
  return require('axios').create({
    maxRedirects,
    httpAgent: new http.Agent({family: 4}),
    httpsAgent: new https.Agent({rejectUnauthorized: false, family: 4}),
  });
};

// @TODO: add some debugging? or only in CLI?
const scan = (baseURL, {okCodes = [], maxRedirects = 0, log = debug, path = '/', timeout = 3000} = {}) => {
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
          test: scan,
          service: service.service,
          delay: _.get(app, `config.services.${service.service}.scanner.delay`, 1000),
          retry: _.get(app, `config.services.${service.service}.scanner.retry`, 25),
          skip: _.get(app, `config.services.${service.service}.scanner`) === false || _.includes(url, '*'),
          title: url,
          args: [url, {
            okCodes: _.get(app, `config.services.${service.service}.scanner.okCodes`, [300, 301, 302, 303, 304, 305, 306, 307, 308, 404]), // eslint-disable-line max-len
            maxRedirects: _.get(app, `config.services.${service.service}.scanner.maxRedirects`, 0),
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

    // if we have the CLI then add more checks but as listr tasks
    if (_.has(lando, 'cli') && lando.cli.runTaskList) {
      const tasks = _(app.checks)
        .filter(checks => checks.type === 'url-scan')
        .groupBy('service')
        .map((tasks, name) => ({
          title: lando.cli.chalk.cyan(`${_.upperCase(name)} URLS`),
          task: (ctx, task) => {
            const subtasks = _(tasks).map(subtask => require('./utils/checks-to-listr')(subtask)).value();
            return task.newListr(subtasks, {concurrent: true, exitOnError: false});
          },
        }))
        .value();

      // add our listr2 check tasklist
      app.checks.push({
        type: 'url-scan-listr2',
        test: lando.cli.runTaskList.bind(lando.cli),
        args: [tasks, {
          renderer: 'lando',
          rendererOptions: {level: 1},
          rendererDebugOptions: {log: app.log.debug},
        }],
      });
    }
  });
};
