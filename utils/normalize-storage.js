'use strict';

const isObject = require('lodash/isPlainObject');
const kebabCase = require('lodash/kebabCase');
const merge = require('lodash/merge');
const toPosixPath = require('./to-posix-path');

module.exports = (volumes = [], {id, project, appRoot, user, normalizeVolumes, _data}) => {
  return volumes.map(volume => {
    // if volume is a single string then its either a bind mount
    if (typeof volume === 'string' && toPosixPath(volume).split(':').length > 1) {
      if (normalizeVolumes.bind({_data, appRoot})([volume]).length > 0) {
        volume = normalizeVolumes.bind({_data, appRoot})([volume])[0];
      }

    // or a service scoped volume
    } else if (typeof volume === 'string' && toPosixPath(volume).split(':').length === 1) {
      volume = {type: 'volume', destination: volume, scope: 'service'};
    }

    // is a volume object and we can rebase on defaults
    if (isObject(volume) && volume.type !== 'bind') {
      // permit dest instead of destination
      if (volume.dest && !volume.destination) volume.destination = volume.dest;
      // remove dest if we have destination for cleanliness purposes
      if (volume.destination && volume.dest) delete volume.dest;
      // addume the volume scope is service if unset
      if (!volume.scope) volume.scope = 'service';

      // merge basics
      volume = merge({}, {
        scope: volume.scope,
        type: 'volume',
        owner: volume.user ?? user.name ?? 'root',
        permissions: volume.permissions ?? volume.perms,
        labels: {
          'dev.lando.storage-scope': volume.scope,
          'dev.lando.storage-volume': 'TRUE',
        },
      }, volume);

      // finally handle the name if still unset, the name implies scope
      if (!volume.name && volume.scope === 'global') {
        volume.name = kebabCase(volume.destination);
      // app
      } else if (!volume.name && volume.scope === 'app') {
        volume.name = `${project}-${kebabCase(volume.destination)}`;
        volume.labels['dev.lando.storage-project'] = project;
      // service
      } else {
        volume.name = `${project}-${id}-${kebabCase(volume.destination)}`;
        volume.labels['dev.lando.storage-project'] = project;
        volume.labels['dev.lando.storage-service'] = id;
      }

      // map back to target/source
      volume.source = volume.name;
      volume.target = volume.destination;
    }

    return volume;
  });
};
