'use strict';

// Modules
const _ = require('lodash');
const chalk = require('chalk');

// @TODO: start table needs to be removed eventually
// @TODO: parseMetrics needs to go in a plugin eventaully
// @NOTE: this file exists for backwards compatibility

/*
 * Returns a CLI table with app start metadata info
 */
exports.startTable = (app, {legacyScanner = false} = {}) => {
  const data = {
    name: app.name,
    location: app.root,
    services: _(app.info)
      .map(info => (info.healthy) ? chalk.green(info.service) : chalk.yellow(info.service))
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
          item.theme = chalk[item.color](item.url);
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
exports.metricsParse = app => {
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
