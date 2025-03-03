'use strict';

// Modules
const _ = require('lodash');
const path = require('path');
const toObject = require('../utils/to-object');

// Helper to get named volume
const getNamedVolumeName = exclude => 'exclude_' + path
  .normalize(exclude).replace(/\W/g, '').split(path.sep).join('_');

// Helper to map exclude directories to named volume name
const getNamedVolumeNames = (excludes = []) => _(excludes)
  .map(exclude => getNamedVolumeName(exclude))
  .value();

// Helper to get named volumes
const getNamedVolumes = (excludes = []) => _(excludes)
  .thru(excludes => toObject(getNamedVolumeNames(excludes)))
  .value();

// Get service volumes
const getServiceVolumes = (excludes = [], base = '/tmp') => _(excludes)
  .map(exclude => ({mount: getNamedVolumeName(exclude), path: path.posix.join(base, exclude)}))
  .map(exclude => `${exclude.mount}:${exclude.path}`)
  .value();

/*
 * Build CA service
 */
module.exports = {
  name: '_mounter',
  parent: '_lando',
  config: {
    version: 'custom',
    type: 'mounter',
    name: 'mounter',
  },
  builder: (parent, config) => class LandoMounter extends parent {
    constructor({userConfRoot, gid, uid}, app, excludes = []) {
      const mountService = {
        services: {
          mounter: {
            command: 'tail -f /dev/null',
            image: 'devwithlando/util:4',
            environment: {
              LANDO_HOST_UID: uid,
              LANDO_HOST_GID: gid,
            },
            labels: {},
          },
        },
        volumes: getNamedVolumes(excludes),
      };
      // Add in named volume mounts
      mountService.services.mounter.volumes = getServiceVolumes(excludes);
      mountService.services.mounter.volumes.push(`${app}:/source:cached`);
      // Add moar stuff
      mountService.services.mounter.environment.LANDO_SERVICE_TYPE = 'mounter';
      mountService.services.mounter.labels['io.lando.service-container'] = 'TRUE';
      mountService.services.mounter.labels['io.lando.mount-container'] = 'TRUE';
      super('mounter', _.merge({}, config, {userConfRoot}), mountService);
    }
  },
};

