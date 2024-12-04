'use strict';

const _ = require('lodash');

module.exports = async app => {
  // get buildable services
  const buildV4Services = _(app.v4.parsedConfig)
    .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
    .map(service => service.name)
    .value();

  // filter out any services that dont need to be built
  const services = _(app.v4.services)
    .filter(service => _.includes(buildV4Services, service.id))
    .filter(service => typeof service.buildApp === 'function')
    .filter(service => service?.info?.state?.IMAGE === 'BUILT')
    .filter(service => service?.info?.state?.APP !== 'BUILT')
    .value();

  // start by getting existing storage
  const estorage = _(await Promise.all(services.map(async service => await service.getStorageVolumes())))
    .flatten()
    .filter(volume => volume !== 'service')
    .uniqBy('id')
    .map(volume => volume.id)
    .value();
  app.log.debug('found existing non-service scoped storage volumes %o', estorage);

  // and then new storage that needs to be created
  const cstorage = _(services)
    .map(service => service.storage)
    .flatten()
    .filter(volume => volume.type === 'volume')
    .filter(volume => !estorage.includes(volume.id))
    .filter(volume => volume.scope !== 'service')
    .filter(volume => volume?.labels?.['dev.lando.storage-volume'] === 'TRUE')
    .groupBy('target')
    .map(group => group[0])
    .value();
  app.log.debug('missing storage volumes %o', cstorage.map(volume => volume.source));

  // create any missing volumes
  await Promise.all(cstorage.map(async volume => {
    // if this iterates is it gauranteed that the below will always work?
    const bengine = services[0].getBengine();
    await bengine.createVolume({Name: volume.source, Labels: volume.labels});
    app.log.debug('created %o storage volume %o with metadata %o', volume.scope, volume.source, volume.labels);
  }));

  // run all build services methods
  app.log.debug('going to build v4 services', services.map(service => service.id));
  await Promise.all(services.map(async service => {
    try {
      await service.buildApp();
    } catch (error) {
      // @TODO: improve this?
      app.log.debug('app build error %o %o', error.message, error);
      app.addMessage(require('../messages/app-build-v4-error')(error), error, true);
    }
  }));
};
