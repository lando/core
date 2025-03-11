'use strict';

// Modules
const _ = require('lodash');

/**
 * @typedef {import('../lib/factory').ComposeService} ComposeService
 * @typedef {import('./_lando').LandoServiceConfig} LandoServiceConfig
 */

/**
 * Configuration options for a Lando webserver service.
 * @typedef {Object} WebServerConfig
 * @extends {LandoServiceConfig}
 * @property {string} webroot - The webroot path relative to /app
 */

/**
 * Base webserver service implementation.
 * @type {Object}
 */
module.exports = {
  /**
   * The name of the service.
   * @type {string}
   */
  name: '_webserver',

  /**
   * The parent service type to extend from.
   * @type {string}
   */
  parent: '_lando',

  /**
   * Creates a new LandoWebServer class extending the parent class.
   * @param {any} parent - The parent class to extend from.
   * @return {any} The LandoWebServer class.
   */
  builder: parent => class LandoWebServer extends parent {
    /**
     * Creates a new LandoWebServer instance.
     * @param {string} id - The unique identifier for the service.
     * @param {Partial<WebServerConfig>} options - Service configuration options.
     * @param {...Object} sources - Additional configuration sources to merge.
     */
    constructor(id, options = {}, ...sources) {
      // Add webserver-specific environment settings
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
          LANDO_SERVICE_TYPE: 'webserver',
        },
        working_dir: '/app',
      })});

      // Add webserver-specific info
      options.info = _.merge({}, options.info, {
        /**
         * The webroot path for the service.
         * @type {string}
         */
        webroot: options.webroot,
      });

      // Call parent constructor with merged configuration
      super(id, options, ...sources);
    }
  },
};
