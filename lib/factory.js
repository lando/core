'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const isClass = require('is-class');
const path = require('path');

const serviceDefaults = {
  api: 3,
  config: {},
  parent: null,
};

/*
 * The lowest level class from which all other services and recipes are built on
 * @TODO: presumably this will get larger over time as we add more options
 */
const dockerCompose = class ComposeService {
  constructor(id, info = {}, ...sources) {
    this.id = id;
    this.info = info;
    this.data = _(sources).map(source => _.merge({}, source)).value();
  }
};

/*
 * The lowest level class from which all other services and recipes are built on
 * @TODO: presumably this will get larger over time as we add more options
 */
const landoRecipe = class LandoRecipe {
  constructor(id, config = {}) {
    // Move our config into the userconfroot if we have some
    // NOTE: we need to do this because on macOS and Windows not all host files
    // are shared into the docker vm
    if (fs.existsSync(config.confSrc)) require('../utils/move-config')(config.confSrc, config.confDest);
    this.id = id;
    this.config = {
      proxy: config.proxy,
      services: config.services,
      tooling: config.tooling,
    };
  }
};

/*
 * @TODO
 */
module.exports = class Factory {
  // @TODO add recipe base class as well?
  constructor(classes = [
    {api: 3, name: '_compose', builder: dockerCompose},
    {api: 3, name: '_recipe', builder: landoRecipe},
  ]) {
    this.registry = classes;
  }

  /*
   * Add things
   * @TODO: Document the common form here
   */
  add(item, data = {}) {
    // newer builders can just be set as a path/name combo and we can bail right away
    // @NOTE: its advisable to move your older builders into the builders directory and rename them
    // to the "type" of the service eg php builder.js -> php.js
    if (_.isString(item) && fs.existsSync(item) && path.basename(item, '.js') !== 'builder') {
      // get the extensionless filename
      const filename = path.basename(item, '.js');
      // for v4 preview services we assume that the filename will end in -v4 and if it does we do this fucked up thing
      const api = _.endsWith(filename, '-v4') ? 4 : 3;
      const name = _.endsWith(filename, '-v4') ? filename.substring(0, filename.length - 3) : filename;

      // push to registry
      this.registry.push(_.merge({}, serviceDefaults, data, {api, name, path: item}));
      // return raw
      return this.getRaw(name, api);
    }

    // older builder.js style servies need to be required so we can get a name
    if (_.isString(item) && fs.existsSync(item) && path.basename(item, '.js') === 'builder') item = require(item);

    // at this point item should be an object so lets just pass it in
    // @TODO: error handling around name etc?
    this.registry.push(_.merge({}, serviceDefaults, data, item));

    // return the raw registry result
    return this.getRaw(item.name);
  }

  /*
   * Retrieve one or all the builders
   */
  get(name, api = 3) {
    // if name is empty then immediately return the entire registry
    if (_.isEmpty(name)) return this.registry;

    // otherwise lets see what we can find
    let service = _.find(this.registry, {api, name});

    // throw error if builder is not found
    // @NOTE: is this breaking?
    if (!service) throw new Error(`Could not find a service builder called ${name} in the builder registry!`);

    // if service has a path and no builder then lets require and merge in first?
    if (!service.builder && fs.existsSync(service.path)) {
      service = _.merge({}, serviceDefaults, service, require(service.path));
    }

    // if service builder is a function and not a class then we need to pass the parent in until we get resolution
    if (_.isFunction(service.builder) && !isClass(service.builder)) {
      service.builder = service.builder(this.get(service.parent, service.api), service.defaults ?? service.config);
    }

    // if we are here then we *should* have the class we need?
    return service.builder;
  }

  /*
   * Retrieves directly from regisstry
   */
  getRaw(name, api = 3) {
    return (!_.isEmpty(name)) ? _.find(this.registry, {api, name}) : this.registry;
  }
};
