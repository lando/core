'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const yaml = require('../components/yaml');

/*
 * @TODO
 */
const normalizePluginDirs = (dirs = [], baseDir = __dirname, isLandoFile = false) => _(dirs)
  .map(data => {
    if (_.isString(data)) {
      return {
        path: data,
        subdir: isLandoFile ? '.' : 'plugins',
      };
    }
    // or just return
    return data;
  })
  .map(data => {
    if (path.isAbsolute(data.path)) return data;
    else {
      data.path = path.resolve(baseDir, data.path);
      return data;
    }
  })
  .value();

/*
 * @TODO
 */
const normalizePlugins = (plugins = [], baseDir = __dirname) => _(plugins)
  // @NOTE: right now this is very "dumb", if the plugin is a path that exist then we set to local
  // otherwise we assume it needs to be grabbed, although we don't have a way to grab it yet
  // @TODO: we need to figure out what the supported API for plugins should be, right now we ASSUME
  // it is a key/value pair where value is ONLY a string but we should probably support passing in objects as well
  .map((value, key) => {
    // Try to figure out what the local path would be
    const pluginPath = path.isAbsolute(value) ? value : path.join(baseDir, value);
    // If SOMETHING exists at that path then assume its a local plugin
    if (fs.existsSync(pluginPath)) return {name: key, type: 'local', path: pluginPath};
    // Otherwise assume its an external one
    // @TODO: Should we also set a path here for where the plugin should be installed?
    else return {name: key, type: 'remote', version: value};
  })
  .value();

module.exports = files => _(files)
  // Filter the source out if it doesn't exist
  .filter(source => fs.existsSync(source) || fs.existsSync(source.file))
  // If the file is just a string lets map it to an object
  .map(source => {
    return _.isString(source) ? {file: source, data: yaml.load(fs.readFileSync(source))} : source;
  })
  // Add on the root directory for mapping purposes
  .map(source => _.merge({}, source, {root: path.dirname(source.file)}))
  // Handle plugins/pluginDirs if they are relative paths
  // @TODO: is this the right place to do this? probably not but lets vibe it until we redo it all in v4
  .map(source => {
    // Normlize pluginDirs data
    if (!_.isEmpty(source.data.pluginDirs)) {
      source.data.pluginDirs = normalizePluginDirs(source.data.pluginDirs, source.root, source.landoFile);
    }
    // Ditto for plugins
    if (!_.isEmpty(source.data.plugins)) {
      source.data.plugins = normalizePlugins(source.data.plugins, source.root);
    }
    // Return the source back
    return source;
  })
  // Start collecting
  .reduce((a, source) => require('./legacy-merge')(a, source.data), {});
