'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} ServiceBuilder
 * @property {number} api - The API version of the service
 * @property {string} name - The name of the service
 * @property {(new (id: string, info?: Object, ...sources: Object[]) => any)|string|((parent?: any, defaults?: Object) => any)} builder - The builder function, class, or path to builder
 * @property {string} [path] - Optional path to the service builder file
 * @property {string} [parent] - Optional parent service name
 * @property {Object} [defaults] - Optional default configuration
 * @property {Object} [config] - Optional configuration
 */

/**
 * Default service configuration.
 */
const serviceDefaults = {
  api: 3,
  config: {},
  parent: null,
};

/**
 * The lowest level class from which all other services and recipes are built on.
 * @class ComposeService
 * @classdesc Base class for all Lando services and recipes.
 */
class ComposeService {
  /**
   * Creates a new ComposeService instance.
   * @param {string} id - The unique identifier for the service.
   * @param {Object} info - The service information.
   * @param {...Object} sources - Additional configuration sources to merge.
   */
  constructor(id, info = {}, ...sources) {
    this.id = id;
    this.info = info;
    this.data = _(sources).map(source => _.merge({}, source)).value();
  }
}

/**
 * A recipe class that provides configuration for Lando services.
 * @class LandoRecipe
 * @classdesc Handles recipe-specific configuration and setup.
 */
class LandoRecipe {
  /**
   * Creates a new LandoRecipe instance.
   * @param {string} id - The unique identifier for the recipe.
   * @param {Object} config - The recipe configuration.
   * @param {string} [config.confSrc] - Source path for configuration files.
   * @param {string} [config.confDest] - Destination path for configuration files.
   * @param {Object} [config.proxy] - Proxy configuration.
   * @param {Object} [config.services] - Services configuration.
   * @param {Object} [config.tooling] - Tooling configuration.
   */
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
}

/**
 * Factory class for creating and managing Lando services.
 * @class Factory
 * @classdesc Manages the registration and retrieval of Lando services and recipes.
 */
class Factory {
  /**
   * Creates a new Factory instance.
   * @param {ServiceBuilder[]} classes - The initial service builders to register.
   */
  constructor(classes = [
    {api: 3, name: '_compose', builder: ComposeService},
    {api: 3, name: '_recipe', builder: LandoRecipe},
  ]) {
    /** @type {ServiceBuilder[]} */
    this.registry = classes;
  }

  /**
   * Adds a new service to the registry.
   * @param {(string|ServiceBuilder)} item - The item to add. Can be a string path to a builder or a ServiceBuilder object.
   * @param {Object} [data={}] - Additional data to merge with the service configuration.
   * @return {ServiceBuilder|undefined} The raw registry entry for the added service.
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
      /** @type {ServiceBuilder} */
      const newService = _.merge({}, serviceDefaults, data, {api, name, path: item});
      this.registry.push(newService);
      // return raw
      const result = this.getRaw(name, api);
      return result ? result : undefined;
    }

    // older builder.js style servies need to be required so we can get a name
    if (_.isString(item) && fs.existsSync(item) && path.basename(item, '.js') === 'builder') {
      item = require(item);
    }

    // at this point item should be an object so lets just pass it in
    // @TODO: error handling around name etc?
    /** @type {ServiceBuilder} */
    const serviceItem = _.isString(item) ? {api: 3, name: item, builder: require(item)} : item;
    this.registry.push(_.merge({}, serviceDefaults, data, serviceItem));

    // return the raw registry result
    const result = this.getRaw(serviceItem.name);
    return result ? result : undefined;
  }

  /**
   * Retrieves a service builder from the registry.
   * @param {string} name - The name of the service to retrieve.
   * @param {number} [api=3] - The API version of the service.
   * @return {any} The service builder class/function or the entire registry if name is empty.
   * @throws {Error} If the requested service builder cannot be found.
   */
  get(name, api = 3) {
    // if name is empty then immediately return the entire registry
    if (_.isEmpty(name)) return this.registry;

    // otherwise lets see what we can find
    /** @type {ServiceBuilder|undefined} */
    let service = _.find(this.registry, {api, name});

    // throw error if builder is not found
    // @NOTE: is this breaking?
    if (!service) throw new Error(`Could not find a service builder called ${name} in the builder registry!`);

    // if service has a path and no builder then lets require and merge in first?
    if (service.path && (_.isString(service.builder) || !service.builder) && fs.existsSync(service.path)) {
      service = _.merge({}, serviceDefaults, service, require(service.path));
    }

    // If the builder is already a class constructor, return it directly
    if (_.isFunction(service.builder) && service.builder.toString().startsWith('class')) {
      return service.builder;
    }

    // if service builder is a function then we need to pass the parent in until we get resolution
    if (_.isFunction(service.builder)) {
      const parent = service.parent ? this.get(service.parent, service.api) : undefined;
      const builderArgs = [parent];

      // For both v3 and v4 services, pass the config/defaults
      const config = service.defaults ?? service.config ?? {};
      builderArgs.push(config);

      service.builder = service.builder.apply(null, builderArgs);
    }

    // if we are here then we *should* have the class we need?
    return service.builder;
  }

  /**
   * Retrieves the raw registry entry for a service.
   * @param {string} name - The name of the service to retrieve.
   * @param {number} [api=3] - The API version of the service.
   * @return {ServiceBuilder|undefined} The raw registry entry for the service or undefined if not found.
   */
  getRaw(name, api = 3) {
    return (!_.isEmpty(name)) ? _.find(this.registry, {api, name}) : undefined;
  }
}

// Export the ComposeService and LandoRecipe classes as named exports
exports.ComposeService = ComposeService;
exports.LandoRecipe = LandoRecipe;

// Export the Factory class as the default export
module.exports = Factory;
