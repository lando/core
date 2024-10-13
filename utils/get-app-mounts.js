'use strict';

const _ = require('lodash');

module.exports = app => _(app.services)
  // Objectify
  .map(service => _.merge({name: service}, _.get(app, `config.services.${service}`, {})))
  // Set the default
  .map(config => _.merge({}, config, {app_mount: _.get(config, 'app_mount', app.config.app_mount || 'cached')}))
  // Filter out disabled mountes
  .filter(config => config.app_mount !== false && config.app_mount !== 'disabled')
  // Combine together
  .map(config => ([config.name, {volumes: [`${app.root}:/app:${config.app_mount}`]}]))
  .fromPairs()
  .value();
