'use strict';

// Modules
const _ = require('lodash');
const path = require('path');
const toObject = require('../utils/to-object');

// Helper to get excludes
const getExcludes = (data = [], inverse = false) => _(data)
  .filter(exclude => _.startsWith(exclude, '!') === inverse)
  .map(exclude => _.trimStart(exclude, '!'))
  .uniq()
  .compact()
  .value();

// Get directories to include
const getIncludeVolumes = (excludes = [], base = '/app', mount = 'cached') => _(excludes)
  .map(exclude => `${base}/${exclude}:/app/${exclude}:${mount}`)
  .value();

// Helper to get includes
const getIncludes = data => getExcludes(data, true);

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

// Helper to get popuylation command
const getPopCommand = (excludes = []) => _.compact(_.flatten([['/helpers/mounter.sh'], excludes]));

// Get service volumes
const getServiceVolumes = (excludes = [], base = '/tmp') => _(excludes)
  .map(exclude => ({mount: getNamedVolumeName(exclude), path: path.posix.join(base, exclude)}))
  .map(exclude => `${exclude.mount}:${exclude.path}`)
  .value();

// Helper to determine whether we should exclude
const shouldExclude = (excludes = []) => {
  // Only do this on non linux
  if (process.platform === 'linux') return false;
  // Otherwise return if we have non-empty config
  return !_.isEmpty(getExcludes(excludes));
};

module.exports = (app, lando) => {
  if (shouldExclude(_.get(app, 'config.excludes', []))) {
    // Get our excludes
    const excludes = getExcludes(app.config.excludes);
    const includes = getIncludes(app.config.excludes, true);

    // If we have no build lock and cant use mutagen lets make sure we (re)populate our volumes
    app.events.on('pre-start', 2, () => {
      if (!lando.cache.get(`${app.name}.build.lock`)) {
        const LandoMounter = lando.factory.get('_mounter');
        const mountData = new LandoMounter(lando.config, app.root, excludes);
        const mountDir = path.join(lando.config.userConfRoot, 'mounter', app.name);
        const mountFiles = lando.utils.dumpComposeData(mountData, mountDir);
        const run = {
          compose: mountFiles,
          project: app.project,
          cmd: getPopCommand(excludes),
          opts: {
            mode: 'attach',
            services: ['mounter'],
            autoRemove: true,
            workdir: '/source',
          },
        };
        return lando.engine.run(run)
        // Destroy on fail
        .catch(err => {
          run.opts = {purge: true, mode: 'attach'};
          return lando.engine.stop(run).then(() => lando.engine.destroy(run)).then(() => lando.Promise.reject(err));
        });
      }
    });

    // Sharing is caring
    app.events.on('post-init', () => {
      const serviceExcludes = getServiceVolumes(excludes, '/app');
      const serviceIncludes = getIncludeVolumes(includes, app.root);

      // only allow excludes on non api4 services
      const services = app.services.filter(service => {
        const {api} = app.info.find(s => s.service === service) ?? {api: 3};
        return api !== 4;
      });

      app.add(new app.ComposeService('excludes', {}, {
        volumes: getNamedVolumes(excludes),
        services: toObject(services, {
          volumes: _.compact(serviceExcludes.concat(serviceIncludes)),
        }),
      }));
    });
  }
};
