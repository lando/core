/**
 * @module builders/_lando
 * @description Lando service builder for Lando services. This module provides the base
 * implementation for all Lando services, handling configuration, environment setup,
 * and container orchestration.
 */

'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');
const write = require('../utils/write-file');

const {color} = require('listr2');
const {nanoid} = require('nanoid');

/**
 * Configuration options for a Lando service.
 * @typedef {Object} LandoServiceConfig
 * @property {string} name - Service name
 * @property {Object} [healthcheck] - Health check configuration
 * @property {string} type - Service type (e.g., 'apache', 'nginx', 'php')
 * @property {string} userConfRoot - User config root directory
 * @property {string} version - Service version
 * @property {string} [confDest] - Config destination path in container
 * @property {string} [confSrc] - Config source path on host
 * @property {Object} [config] - Configuration files mapping (remote path -> local path)
 * @property {string} [data] - Data directory name for persistent storage
 * @property {string} [dataHome] - Data home directory name for user data
 * @property {string} [entrypoint] - Container entrypoint script
 * @property {string} [home] - Home directory path in container
 * @property {string[]} [moreHttpPorts] - Additional HTTP ports to expose
 * @property {Object} [info] - Service information for display
 * @property {string[]} [legacy] - Legacy versions to warn about
 * @property {string} [meUser] - Service user inside container
 * @property {boolean} [patchesSupported] - Whether patch versions are supported
 * @property {Object} [pinPairs] - Version pinning configuration
 * @property {string[]} [ports] - Ports to expose
 * @property {string} [project] - Project name for namespacing
 * @property {Object} [overrides] - Docker compose overrides
 * @property {boolean} [refreshCerts] - Whether to refresh SSL certificates
 * @property {Object} [remoteFiles] - Remote files mapping
 * @property {string[]} [scripts] - Additional scripts to mount
 * @property {boolean|string} [scriptsDir] - Scripts directory to mount
 * @property {string} [sport] - SSL port number
 * @property {boolean} [ssl] - Whether SSL is enabled
 * @property {boolean} [sslExpose] - Whether to expose SSL ports
 * @property {string[]} [supported] - List of supported versions
 * @property {boolean} [supportedIgnore] - Whether to ignore version support check
 * @property {string} [root] - Root directory for relative paths
 */

/**
 * The lowest level lando service definition.
 * @typedef {Object} ServiceTypeLando
 * @property {string} parent - The parent service type to extend from.
 * @property {(parent: any) => any} builder - Builder function that returns a service class.
 */

/**
 * Base Lando service implementation.
 * @type {ServiceTypeLando}
 */
module.exports = {
  name: '_lando',
  parent: '_compose',
  /**
   * Creates a new LandoLando service class.
   * @param {any} parent - The parent class to extend from.
   * @return {any} The LandoLando service class.
   */
  builder: parent => class LandoLando extends parent {
    /**
     * Creates a new LandoLando service instance.
     * @param {string} id - The unique identifier for the service.
     * @param {Partial<LandoServiceConfig>} options - Service configuration options.
     * @param {...Object} sources - Additional configuration sources to merge.
     */
    constructor(
      id,
      {
        name,
        healthcheck,
        type,
        userConfRoot,
        version,
        confDest = '',
        confSrc = '',
        config = {},
        data = `data_${name}`,
        dataHome = `home_${name}`,
        entrypoint = '/lando-entrypoint.sh',
        home = '',
        moreHttpPorts = [],
        info = {},
        legacy = [],
        meUser = 'www-data',
        patchesSupported = false,
        pinPairs = {},
        ports = [],
        project = '_lando_',
        overrides = {},
        refreshCerts = false,
        remoteFiles = {},
        scripts = [],
        scriptsDir = false,
        sport = '443',
        ssl = false,
        sslExpose = true,
        supported = ['custom'],
        supportedIgnore = false,
        root = '',
      } = {},
      ...sources
    ) {
      // Add custom to list of supported
      supported.push('custom');

      // rebase remoteFiles on testing data
      remoteFiles = _.merge({}, {'_lando_test_': '/tmp/rooster'}, remoteFiles);

      // If this version is not supported throw an error
      // @TODO: get this someplace else for unit tezting
      if (!supportedIgnore && !_.includes(supported, version)) {
        if (!patchesSupported
          || !_.includes(require('../utils/strip-wild')(supported), require('../utils/strip-patch')(version))) {
          throw Error(`${type} version ${version} is not supported`);
        }
      }
      if (_.includes(legacy, version)) {
        console.error(color.yellow(`${type} version ${version} is a legacy version! We recommend upgrading.`));
      }

      // normalize scripts dir if needed
      if (typeof scriptsDir === 'string' && !path.isAbsolute(scriptsDir)) scriptsDir = path.resolve(root, scriptsDir);

      // Get some basic locations
      const globalScriptsDir = path.join(userConfRoot, 'scripts');
      const serviceScriptsDir = path.join(userConfRoot, 'helpers', project, type, name);
      const entrypointScript = path.join(globalScriptsDir, 'lando-entrypoint.sh');
      const addCertsScript = path.join(globalScriptsDir, 'add-cert.sh');
      const refreshCertsScript = path.join(globalScriptsDir, 'refresh-certs.sh');

      // Move our config into the userconfroot if we have some
      // NOTE: we need to do this because on macOS and Windows not all host files
      // are shared into the docker vm
      if (fs.existsSync(confSrc)) require('../utils/move-config')(confSrc, confDest);

      // ditto for service helpers
      if (!require('../utils/is-disabled')(scriptsDir) && typeof scriptsDir === 'string' && fs.existsSync(scriptsDir)) {
        require('../utils/move-config')(scriptsDir, serviceScriptsDir);
      }

      // Handle Environment
      const environment = {
        LANDO_SERVICE_NAME: name,
        LANDO_SERVICE_TYPE: type,
      };

      // Handle labels
      const labels = {
        'io.lando.http-ports': _.uniq(['80', '443'].concat(moreHttpPorts)).join(','),
        'io.lando.https-ports': _.uniq(['443'].concat([sport])).join(','),
      };
      // Set a reasonable log size
      const logging = {driver: 'json-file', options: {'max-file': '3', 'max-size': '10m'}};

      // Handle volumes
      const volumes = [
        `${userConfRoot}:/lando:cached`,
        `${globalScriptsDir}:/helpers`,
        `${entrypointScript}:/lando-entrypoint.sh`,
        `${dataHome}:/var/www`,
      ];

      // add in service helpers if we have them
      if (fs.existsSync(serviceScriptsDir)) volumes.push(`${serviceScriptsDir}:/etc/lando/service/helpers`);

      // Handle ssl
      if (ssl) {
        // also expose the sport
        if (sslExpose) ports.push(sport);

        // certs
        const certname = `${id}.${project}.crt`;
        const keyname = `${id}.${project}.key`;
        environment.LANDO_SERVICE_CERT = `/lando/certs/${certname}`;
        environment.LANDO_SERVICE_KEY = `/lando/certs/${keyname}`;
        volumes.push(`${addCertsScript}:/scripts/000-add-cert`);
        volumes.push(`${path.join(userConfRoot, 'certs', certname)}:/certs/cert.crt`);
        volumes.push(`${path.join(userConfRoot, 'certs', keyname)}:/certs/cert.key`);
      }

      // Add in some more dirz if it makes sense
      if (home) volumes.push(`${home}:/user:cached`);

      // Handle cert refresh
      // @TODO: this might only be relevant to the proxy, if so let's move it there
      if (refreshCerts) volumes.push(`${refreshCertsScript}:/scripts/999-refresh-certs`);

      // Add in any custom pre-runscripts
      for (const script of scripts) {
        const local = path.resolve(root, script);
        const remote = path.join('/scripts', path.basename(script));
        volumes.push(`${local}:${remote}`);
      }

      // Handle custom config files
      for (let [remote, local] of Object.entries(config)) {
        // if we dont have entries we can work with then just go to the next iteration
        if (!_.has(remoteFiles, remote) && typeof remote !== 'string') continue;

        // if this is special type then get it from remoteFile
        remote = _.has(remoteFiles, remote) ? remoteFiles[remote] : path.resolve('/', remote);

        // if file is an imported string lets just get the file path instead
        if (local?.constructor?.name === 'ImportString') {
          const meta = local.getMetadata();
          if (meta.file) local = meta.file;
          else local = local.toString();
        }

        // if file is still a multiline string then dump to tmp and use that
        if (typeof local === 'string' && local.split('\n').length > 1) {
          const contents = local;
          local = path.join(os.tmpdir(), nanoid());
          write(local, contents, {forcePosixLineEndings: true});
        }

        volumes.push(`${path.resolve(root, local)}:${remote}`);
      }

      // Add named volumes and other thingz into our primary service
      const namedVols = {};
      _.set(namedVols, data, {});
      _.set(namedVols, dataHome, {});

      sources.push({
        services: _.set({}, name, {
          entrypoint,
          environment,
          extra_hosts: ['host.lando.internal:host-gateway'],
          labels,
          logging,
          ports,
          volumes,
        }),
        volumes: namedVols,
      });

      // Add a final source if we need to pin pair
      if (_.includes(_.keys(pinPairs), version)) {
        sources.push({services: _.set({}, name, {image: _.get(pinPairs, version, version)})});
      }

      // Add our overrides at the end
      sources.push({services: _.set({}, name, require('../utils/normalize-overrides')(overrides, root))});

      // Add some info basics
      info.config = config;
      info.service = name;
      info.type = type;
      info.version = version;
      info.meUser = meUser;
      info.hasCerts = ssl;
      info.api = 3;

      // Add the healthcheck if it exists
      if (healthcheck) info.healthcheck = healthcheck;

      // Pass it down
      super(id, info, ...sources);
    }
  },
};
