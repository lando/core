'use strict';

/**
 * @typedef {import('../lib/factory').ComposeService} ComposeService
 * @typedef {import('./_lando').LandoServiceConfig} LandoServiceConfig
 */

const _ = require('lodash');

/**
 * Configuration options for a Lando v3 service.
 * @typedef {Object} LandoV3Config
 * @extends {LandoServiceConfig}
 * @property {string} version - The version of the service
 * @property {Object} services - Docker compose services configuration
 * @property {Object} networks - Docker compose networks configuration
 * @property {Object} volumes - Docker compose volumes configuration
 */

/**
 * This module exports a configuration object for the Lando service in Lando.
 * It is designed to mimic the v3 "compose" service for testing purposes when the CLI is decoupled from its plugins.
 * Direct use is discouraged, but it should theoretically have the same documentation as https://docs.lando.dev/compose/, except with "type: lando".
 * The name "type: lando" is chosen because it closely resembles the new lowest level typed v4 service, also named lando.
 * @type {Object}
 */
module.exports = {
  /**
   * The name of the service.
   * @type {string}
   */
  name: 'lando',

  /**
   * The API version of the service.
   * @type {number}
   */
  api: 3,

  /**
   * The default configuration for the service.
   * @type {LandoV3Config}
   */
  config: {
    version: 'custom',
    services: {},
    networks: {},
    volumes: {},
  },

  /**
   * The parent service type to extend from.
   * @type {string}
   */
  parent: '_lando',

  /**
   * Creates a new LandoServiceV3 class extending the parent class.
   * @param {any} parent - The parent class to extend from.
   * @param {LandoV3Config} config - The configuration for the service.
   * @return {any} The LandoServiceV3 class.
   */
  builder: (parent, config) => class LandoServiceV3 extends parent {
    /**
     * Creates a new LandoServiceV3 instance.
     * @param {string} id - The unique identifier for the service.
     * @param {Partial<LandoV3Config>} options - Service configuration options.
     */
    constructor(id, options = {}) {
      // Merge default config with provided options
      options = _.merge({}, config, options);

      // Call parent constructor with merged configuration and compose settings
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
