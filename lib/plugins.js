'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const glob = require('glob');
const Log = require('./logger');
const path = require('path');
const resolver = (process.platform === 'win32') ? path.win32.resolve : path.posix.resolve;

// List of autoload locations to scan for
const autoLoaders = [
  'app.js',
  'builders',
  'compose',
  'inits',
  'methods',
  'scripts',
  'services',
  'sources',
  'recipes',
  'tasks',
  'types',
];

// eslint-disable-next-line
const dynamicRequire = () => (typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require);

// Helper to build out a fully fleshed plugin object
const buildPlugin = (file, namespace)=> ({
  name: _.compact([namespace, _.last(resolver(path.dirname(file)).split(path.sep))]).join('/'),
  path: file,
  dir: path.dirname(file),
});

/*
 * @TODO
 */
module.exports = class Plugins {
  constructor(log = new Log()) {
    this.registry = [];
    this.log = log;
  }

  discover(plugin) {
    // @NOTE: we need to start preferring "sandboxed" locations for the future when we have "hybrid" plugins
    // eg plugins that have both v3 and v4 things. this is necessary because we dont want v3 to be accidently autoloading
    // v4 things and blowing the whole thing up so before we start plugin discovery lets see if the plugin is "v3 sanboxed"
    // and if it is then lets only look in that dir for stuff
    // start by assuming the search dir is the plugin root itself
    plugin.searchDir = plugin.dir;

    // but change it to a subdirectory if we have one of the approved ones
    if (fs.existsSync(path.join(plugin.dir, 'legacy'))) plugin.searchDir = path.join(plugin.dir, 'legacy');
    if (fs.existsSync(path.join(plugin.dir, 'v3'))) plugin.searchDir = path.join(plugin.dir, 'v3');

    // proceed sir
    return _(autoLoaders)
      .map(thing => path.join(plugin.searchDir, thing))
      .filter(path => fs.existsSync(path))
      .keyBy(file => path.basename(_.last(file.split(path.sep)), '.js'))
      .value();
  }

  /**
   * Finds plugins
   *
   * @since 3.5.0
   * @alias lando.plugins.find
   * @param {Array} dirs Directories to scan for plugins
   * @param {Object} options Options to pass in
   * @param {Array} [options.disablePlugins=[]] Array of plugin names to not load
   * @param {Array} [options.plugins=[]] Array of additional plugins to consider loading
   * @return {Array} Array of plugin metadata
   */
  find(dirs, {disablePlugins = [], plugins = []} = {}) {
    return _(dirs)
      // Map string usage to object and set path
      .map(data => {
        // Map string to object
        if (_.isString(data)) data = {path: path.join(data)};
        // Assemble the dir to scan
        data.dir = path.join(data.path, _.get(data, 'subdir', 'plugins'));
        return data;
      })

      // Start by scanning for plugins
      .filter(data => fs.existsSync(data.dir))
      .flatMap(data => _.merge({}, data, {plugins: glob.sync(path.join(data.dir, '*', 'index.js'))}))
      .flatMap(data => _.map(data.plugins, plugin => buildPlugin(plugin, data.namespace)))

      // This is a dumb filter to check that external "@lando" plugins have a plugin.yml
      // We do this to prevent things like @lando/vuepress-theme-default-plus from being from being loaded as plugins
      // @NOTE: in Lando 4 we we will explicitly look for a manifest file, that may be plugin.yml or something else.
      .filter(data => {
        if (_.includes(path.normalize(data.dir), path.normalize(path.join('node_modules', '@lando')))) {
          return fs.existsSync(path.join(data.dir, 'plugin.yml'));
        } else if (_.includes(path.normalize(data.dir), path.normalize(path.join('plugins', 'lando-')))) {
          return fs.existsSync(path.join(data.dir, 'plugin.yml'));
        } else return true;
      })
      // Then mix in any local ones that are passed in
      .thru(candidates => candidates.concat(_(plugins)
        // Start by filtering out non-local ones
        .filter(plugin => plugin.type === 'local')
        // Manually map into plugin object
        .map(plugin => ({name: plugin.name, path: path.join(plugin.path, 'index.js'), dir: plugin.path}))
        // Filter again to make sure we have an index.js
        .filter(plugin => fs.existsSync(plugin.path))
        .value(),
      ))
      // Then remove any that are flagged as disabled
      .filter(plugin => !_.includes(disablePlugins, plugin.name))
      // Then load the correct one based on the ordering
      .groupBy('name')
      .map(plugins => _.last(plugins))
      .map(plugin => _.merge({}, plugin, this.discover(plugin)))
      // because all of this is now a mess we need to make @lando/core is first in the list
      .thru(plugins => {
        const core = _.remove(plugins, {name: '@lando/core'});
        if (core[0]) plugins.unshift(core[0]);
        return plugins;
      })
      .value();
  }

  /**
   * Loads a plugin.
   *
   * @since 3.0.0
   * @alias lando.plugins.load
   * @param {String} plugin The name of the plugin
   * @param {String} [file=plugin.path] That path to the plugin
   * @param {Object} [...injected] Something to inject into the plugin
   * @return {Object} Data about our plugin.
   */
  load(plugin, file = plugin.path, ...injected) {
    // try to load the plugin and its data directly
    try {
      plugin.data = dynamicRequire()(file)(...injected);
    } catch (e) {
      this.log.error('problem loading plugin %o from %o: %o', plugin.name, file, e.stack);
    }

    // Register, log, return
    this.registry.push(plugin);
    this.log.debug('plugin %o loaded from %s', plugin.name, file);
    this.log.silly('plugin %o has', plugin.name, plugin.data);

    // merge promise magix so we can await or not
    return require('./../utils/merge-promise')(plugin, async () => {
      // if plugin.data is not a promise then just return plugin
      if (_.get(plugin, 'data.constructor.name') !== 'Promise') return {...plugin};
      // otherwise ASYNCIT
      return plugin.data.then(data => ({...plugin, data}));
    });
  }
};
