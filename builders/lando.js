'use strict';

const _ = require('lodash');

/*
 * this should be the same as the v3 "compose" service but we are stealth loading it in core so that we can
 * use it for testing when the cli is decoupled from its plugins. you shouldnt really use it directly but theoretically
 * it should have the same docs as https://docs.lando.dev/compose/ except with "type: lando"
 *
 * we've named it "type: lando" as it most closely resembles the new lowest level typed v4 service which is also named
 * lando
 *
 */
module.exports = {
  name: 'lando',
  api: 3,
  config: {
    version: 'custom',
    services: {},
    networks: {},
    volumes: {},
  },
  parent: '_lando',
  builder: (parent, config) => class LandoServiceV3 extends parent {
    constructor(id, options = {}) {
      options = _.merge({}, config, options);
      super(id, options, {
        services: _.set(
          {},
          options.name,
          require('../utils/normalize-overrides')(options.services, options._app.root, options.volumes),
        ),
        networks: options.networks,
        volumes: options.volumes,
      });
    }
  },
};
