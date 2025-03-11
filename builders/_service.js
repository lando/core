'use strict';

// Modules
const _ = require('lodash');

/**
 * @typedef {import('../lib/factory').ComposeService} ComposeService
 * @typedef {import('./_lando').LandoServiceConfig} LandoServiceConfig
 */

/**
 * Configuration options for a Lando service.
 * @typedef {Object} ServiceConfig
 * @extends {LandoServiceConfig}
 * @property {string} [webroot] - The webroot path relative to /app
 * @property {number} [port] - The port to expose
 * @property {boolean|number} [portforward] - Whether to forward ports (true) or a specific port number
 * @property {Object} [_app] - Internal app configuration
 * @property {Object} [_app._config] - App configuration settings
 * @property {string} [_app._config.bindAddress] - The address to bind services to
 * @property {Object} [healthcheck] - Health check configuration
 * @property {Object} [creds] - Service credentials
 */

/**
 * Base service implementation that extends the Lando base service.
 * @type {Object}
 */
module.exports = {
  /**
   * The name of the service.
   * @type {string}
   */
  name: '_service',

  /**
   * The parent service type to extend from.
   * @type {string}
   */
  parent: '_lando',

  /**
   * Creates a new LandoService class extending the parent class.
   * @param {any} parent - The parent class to extend from.
   * @return {any} The LandoService class.
   */
  builder: parent => class LandoService extends parent {
    /**
     * Creates a new LandoService instance.
     * @param {string} id - The unique identifier for the service.
     * @param {Partial<ServiceConfig>} options - Service configuration options.
     * @param {...Object} sources - Additional configuration sources to merge.
     */
    constructor(id, options = {}, ...sources) {
      // Add the service environment settings
      sources.push({services: _.set({}, options.name, {
        environment: {
          /**
           * The webroot path for the service.
           * @type {string}
           */
          LANDO_WEBROOT: `/app/${options.webroot}`,
          /**
           * The type of the service.
           * @type {string}
           */
          LANDO_SERVICE_TYPE: 'service',
        },
      })});

      // Add port forwarding settings if specified
      if (options.portforward) {
        if (options.portforward === true) {
          // Add port forwarding for the service using the default port
          sources.push({services: _.set({}, options.name, {ports: [options.port]})});
        } else {
          // Add port forwarding with a custom port mapping
          sources.push({services: _.set({}, options.name, {ports: [`${options.portforward}:${options.port}`]})});
        }
      }

      // Merge the info object with default connection settings
      options.info = _.merge({}, options.info, {
        /**
         * Internal connection details for service-to-service communication.
         * @type {Object}
         * @property {string} host - The service hostname
         * @property {number} port - The service port
         */
        internal_connection: {
          host: options.name,
          port: options.port,
        },
        /**
         * External connection details for host machine access.
         * @type {Object}
         * @property {string} host - The bind address
         * @property {number|string} port - The forwarded port or 'not forwarded'
         */
        external_connection: {
          host: options._app._config.bindAddress,
          port: _.get(options, 'portforward', 'not forwarded'),
        },
      });

      // Add healthcheck settings if specified
      if (options.healthcheck) options.info.healthcheck = options.healthcheck;

      // Add credentials if specified
      if (options.creds) options.info.creds = options.creds;

      // Call the parent constructor with the merged configuration
      super(id, options, ...sources);
    }
  },
};
