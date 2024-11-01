'use strict';

// Modules
const _ = require('lodash');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (config, composeServiceIds, app) => _(config)
  // Arrayify
  .map((service, name) => _.merge({}, service, {name}))
  // Filter out any services which are not defined in the docker compose services
  .filter(service => _.includes(composeServiceIds, service.name))
  .filter(service => 4 !== service.api)
  // Build the config and ensure api is set to 3
  .map(service => _.merge({}, {
    _app: app,
    app: app.name,
    home: app.config.home || app._config.home,
    project: app.project,
    root: app.root,
    type: '_lando-compose',
    version: 'custom',
    userConfRoot: app._config.userConfRoot,
    api: 3,
    entrypoint: null, // NOTE: Do not overwrite the entrypoint from docker compose. Or should we?
    data: null, // NOTE: Do not create the data volume
    dataHome: null, // NOTE: Do not create the dataHome volume
    meUser: 'root',
    appMount: '/',
    sslExpose: false,
  }, service))
  .value();
