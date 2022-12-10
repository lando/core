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
  'compose',
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

// Helper to discover things in the plugin that can be autoloaded
const discoverPlugin = plugin => _(autoLoaders)
  .map(thing => path.join(plugin.dir, thing))
  .filter(path => fs.existsSync(path))
  .keyBy(file => path.basename(_.last(file.split(path.sep)), '.js'))
  .value();

/*
 * @TODO
 */
module.exports = class Plugins {
  constructor(log = new Log()) {
    this.registry = [];
    this.log = log;
  };

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
        if (_.includes(data.dir, path.join('node_modules', '@lando'))) {
          return fs.existsSync(path.join(data.dir, 'plugin.yml'));
        } else if (_.includes(data.dir, path.join('plugins', 'lando-'))) {
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
      .map(plugin => _.merge({}, plugin, discoverPlugin(plugin)))
      .value();
  };

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
    try {
      plugin.data = dynamicRequire()(file)(...injected);
    } catch (e) {
      this.log.error('problem loading plugin %s from %s: %s', plugin.name, file, e.stack);
    }

    // Register, log, return
    this.registry.push(plugin);
    this.log.debug('plugin %s loaded from %s', plugin.name, file);
    this.log.silly('plugin %s has', plugin.name, plugin.data);
    return plugin;
  };
};
