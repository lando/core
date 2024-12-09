'use strict';

// Modules
const _ = require('lodash');
const {color} = require('listr2');

// @NOTE: this file exists for backwards compatibility

const getHealth = (info, data) => {
  // any error should be red
  if (info?.error) return color.red(data);
  // image build failures should be red
  if (info?.state?.IMAGE === 'BUILD FAILURE') return color.red(data);
  // failed healthchecks are yellow
  if (info?.healthy === false) return color.yellow(data);
  // otherwise green will do
  return color.green(data);
};

/*
 * Returns a CLI table with app start metadata info
 */
const startTable = (app, {legacyScanner = false} = {}) => {
  const data = {
    name: app.name,
    location: app.root,
    services: _(app.info)
      .map(info => getHealth(info, info.service))
      .values()
      .join(', '),
  };
  const urls = {};

  // Categorize and colorize URLS if and as appropriate
  // add legacy scanner info if appropriate
  if (legacyScanner) {
    _.forEach(app.info, info => {
      if (_.has(info, 'urls') && !_.isEmpty(info.urls)) {
        urls[info.service] = _.filter(app.urls, item => {
          item.theme = color[item.color](item.url);
          return _.includes(info.urls, item.url);
        });
      }
    });

    // Add service URLS
    _.forEach(urls, (items, service) => {
      data[service + ' urls'] = _.map(items, 'theme');
    });

  // add placeholder URLS for non le
  } else {
    data.urls = '';
  }

  // Return data
  return data;
};

/*
 * Helper to parse metrics data
 */
const metricsParse = app => {
  // Metadata to report.
  const data = {
    app: _.get(app, 'id', 'unknown'),
    type: _.get(app, 'config.recipe', 'none'),
  };

  // build an array of services to send as well if we can, prefer info since it has combined v3 and v4 stuff
  if (!_.isEmpty(app.info)) {
    data.services = _.map(_.get(app, 'info'), service => _.pick(service, ['api', 'type', 'version']));

  // otherwise lets use the older config.services
  } else if (_.has(app, 'config.services')) {
    data.services = _.map(_.get(app, 'config.services'), service => service.type);
  }

  // Return
  return data;
};

module.exports = {
  // @TODO: start table needs to be removed eventually
  // @TODO: parseMetrics needs to go in a plugin eventaully
  metricsParse,
  startTable,

  // these all stay for backwards compatib
  appMachineName: (...args) => require('../utils/slugify')(...args),
  dockerComposify: (...args) => require('../utils/docker-composify')(...args),
  dumpComposeData: (...args) => require('../utils/dump-compose-data')(...args),
  getAppMounts: (...args) => require('../utils/get-app-mounts')(...args),
  getCliEnvironment: (...args) => require('../utils/get-cli-env')(...args),
  getGlobals: (...args) => require('../utils/get-app-globals')(...args),
  getId: (...args) => require('../utils/get-container-id')(...args),
  getInfoDefaults: (...args) => require('../utils/get-app-info-defaults')(...args),
  getServices: (...args) => require('../utils/get-app-services')(...args),
  getUser: (...args) => ('../utils/get-user')(...args),
  loadComposeFiles: (...args) => require('../utils/load-compose-files')(...args),
  makeExecutable: (...args) => require('../utils/make-executable')(...args),
  moveConfig: (...args) => require('../utils/move-config')(...args),
  normalizer: (...args) => require('../utils/normalizer')(...args),
  shellEscape: (...args) => require('../utils/shell-escape')(...args),
  toLandoContainer: (...args) => require('../utils/to-lando-container')(...args),
  toObject: (...args) => require('../utils/to-object')(...args),
  validateFiles: (...args) => require('../utils/normalize-files')(...args),

  // these are new and useful v4 thing
  debugShim: (...args) => require('../utils/debug-shim')(...args),
  downloadX: (...args) => require('../utils/download-x')(...args),
  getAxios: (...args) => require('../utils/get-axios')(...args),
  getJsYaml: () => require('js-yaml'),
  getLodash: () => require('lodash'),
  getOctokit: (...args) => require('../utils/get-octokit')(...args),
  getSemver: () => require('semver'),
  getUserShell: (...args) => require('../utils/get-user-shell')(...args),
  getUserShellProfile: (...args) => require('../utils/get-user-shell-profile')(...args),
  isVersionLte: (...args) => require('../utils/is-lte-version')(...args),
  legacyMerge: (...args) => require('../utils/legacy-merge')(...args),
  mergeArrays: (...args) => require('../utils/merge-arrays')(...args),
  mergePromise: (...args) => require('../utils/merge-promise')(...args),
  merge: (...args) => require('../utils/merge')(...args),
  readFile: (...args) => require('../utils/read-file')(...args),
  remove: (...args) => require('../utils/remove')(...args),
  runCommand: (...args) => require('../utils/run-command')(...args),
  runElevated: (...args) => require('../utils/run-elevated')(...args),
  runPowerShell: (...args) => require('../utils/run-powershell-script')(...args),
  slugify: (...args) => require('../utils/slugify')(...args),
  writeFile: (...args) => require('../utils/write-file')(...args),
};
