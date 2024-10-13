'use strict';

// Modules
const _ = require('lodash');
const path = require('path');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (config, app) => _(config)
  // Arrayify
  .map((service, name) => _.merge({}, service, {name}))
  // ensure api is set to something valid
  .map(service => _.merge({}, service, {api: require('./get-service-api-version')(service.api)}))
  // Filter out any services without a type, this implicitly assumes these
  // services are "managed" by lando eg their type/version details are provided
  // by another service
  .filter(service => _.has(service, 'type'))
  // Build the config
  .map(service => _.merge({}, service, {
    _app: app,
    app: app.name,
    confDest: path.join(app._config.userConfRoot, 'config', service.type.split(':')[0]),
    data: `data_${service.name}`,
    home: app.config.home || app._config.home,
    project: app.project,
    root: app.root,
    type: service.type.split(':')[0],
    userConfRoot: app._config.userConfRoot,
    version: service.type.split(':')[1],
  }))
  .value();
