'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const {color} = require('listr2');

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  name: '_lando',
  parent: '_compose',
  builder: parent => class LandoLando extends parent {
    constructor(
      id,
      {
        name,
        healthcheck,
        type,
        userConfRoot,
        version,
        app = '',
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
        webroot = '/app',
      } = {},
      ...sources
    ) {
      // Add custom to list of supported
      supported.push('custom');

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
      _.forEach(scripts, script => {
        const local = path.resolve(root, script);
        const remote = path.join('/scripts', path.basename(script));
        volumes.push(`${local}:${remote}`);
      });

      // Handle custom config files
      _.forEach(config, (file, type) => {
        if (_.has(remoteFiles, type)) {
          const local = path.resolve(root, config[type]);
          const remote = remoteFiles[type];
          volumes.push(`${local}:${remote}`);
        }
      });

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
    };
  },
};
