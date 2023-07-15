'use strict';

// Modules
const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const generator = require('dockerfile-generator');
const path = require('path');
// @TODO: not the best to reach back this far
const moveConfig = require('../../../lib/utils').moveConfig;
const utils = require('../lib/utils');

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  name: '_lando-v4',
  parent: '_compose',
  builder: parent => class LandoLandoV4 extends parent {
    constructor(
      id,
      {
        name,
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
        project = '',
        overrides = {},
        refreshCerts = false,
        remoteFiles = {},
        scripts = [],
        sport = '443',
        ssl = false,
        sslExpose = true,
        supported = ['custom'],
        supportedIgnore = false,
        root = '',
        webroot = '/app',
      } = {},
      imageFile,
      ...sources
    ) {
      // Add custom to list of supported
      supported.push('custom');

      // If this version is not supported throw an error
      // @TODO: get this someplace else for unit tezting
      if (!supportedIgnore && !_.includes(supported, version)) {
        if (!patchesSupported || !_.includes(utils.stripWild(supported), utils.stripPatch(version))) {
          throw Error(`${type} version ${version} is not supported`);
        }
      }
      if (_.includes(legacy, version)) {
        console.error(chalk.yellow(`${type} version ${version} is a legacy version! We recommend upgrading.`));
      }

      // Move our config into the userconfroot if we have some
      // NOTE: we need to do this because on macOS and Windows not all host files
      // are shared into the docker vm
      if (fs.existsSync(confSrc)) moveConfig(confSrc, confDest);

      // Get some basic locations
      const scriptsDir = path.join(userConfRoot, 'scripts');
      const entrypointScript = path.join(scriptsDir, 'lando-entrypoint.sh');
      const addCertsScript = path.join(scriptsDir, 'add-cert.sh');
      const refreshCertsScript = path.join(scriptsDir, 'refresh-certs.sh');

      // Handle volumes
      const volumes = [
        `${userConfRoot}:/lando:cached`,
        `${scriptsDir}:/helpers`,
        `${entrypointScript}:/lando-entrypoint.sh`,
        `${dataHome}:/var/www`,
      ];

      // Handle ssl
      if (ssl) {
        volumes.push(`${addCertsScript}:/scripts/000-add-cert`);
        if (sslExpose) ports.push(sport);
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

      // Handle Environment
      const environment = {LANDO_SERVICE_NAME: name, LANDO_SERVICE_TYPE: type};
      // Handle http/https ports
      const labels = {
        'io.lando.http-ports': _.uniq(['80', '443'].concat(moreHttpPorts)).join(','),
        'io.lando.https-ports': _.uniq(['443'].concat([sport])).join(','),
      };
      // Set a reasonable log size
      const logging = {driver: 'json-file', options: {'max-file': '3', 'max-size': '10m'}};

      // Add named volumes and other thingz into our primary service
      const namedVols = {};
      _.set(namedVols, data, {});
      _.set(namedVols, dataHome, {});
      sources.push({
        services: _.set({}, name, {
          entrypoint,
          environment,
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
      sources.push({services: _.set({}, name, utils.normalizeOverrides(overrides, root))});

      // Add some info basics
      info.config = config;
      info.service = name;
      info.type = type;
      info.version = version;
      info.meUser = meUser;
      info.hasCerts = ssl;

      // Pass it down
      super(id, info, ...sources);

      // Generate our dockerfile
      this.generateDockerFile(imageFile, ...sources);
    };

    // @todo: figure out how to generate the tmpDir string from info available.
    generateDockerFile(imageFile, ...sources) {
      const tmpDir = `/tmp/${this.project}/${this.service}`;
      console.log('tmpDir', tmpDir);
      // Generate Dockerfile and save to filesystem.
      // @todo: Move to _lando-v4.js in core.
      generator.generate(imageFile).then((dockerFile) => {
        return fs.writeFileSync(`${tmpDir}/Dockerfile`, dockerFile);
      }).then(() => {
        console.log('Dockerfile saved successfully!');
      }).catch((err) => {
        console.error('Error saving Dockerfile:', err);
      });
    }
  },
};
