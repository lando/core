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
      // add the volume scope is scope if unset
      if (!volume.scope) volume.scope = 'service';

      // merge basics
      volume = merge({}, {
        owner: volume.user ?? user.name ?? 'root',
        permissions: volume.permissions ?? volume.perms,
        source: volume.source,
        scope: volume.scope,
        target: volume.target ?? volume.destination,
        type: 'volume',
        labels: {
          'dev.lando.storage-scope': volume.scope,
          'dev.lando.storage-volume': 'TRUE',
        },
      }, volume);

      // cleanup props a bit
      delete volume.destination;

      // handle the source if still unset, the name implies scope
      if (!volume.source) {
        if (volume.scope === 'global') volume.source = `lando-${kebabCase(volume.target)}`;
        else if (volume.scope === 'project') volume.source = `${project}-${kebabCase(volume.target)}`;
        else if (volume.scope === 'app') volume.source = `${project}-${kebabCase(volume.target)}`;
        else volume.source = `${project}-${id}-${kebabCase(volume.target)}`;
      }

      // for non-global mounets lets add additional labels so we know which service is
      // resonable for removing which volumes
      if (volume.scope !== 'global') {
        volume.labels['dev.lando.storage-project'] = project;
        volume.labels['dev.lando.storage-service'] = id;
      }
    }

    return volume;
  });
};
