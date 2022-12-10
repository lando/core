'use strict';

// Modules
const _ = require('lodash');
const browsers = ['electron', 'chrome', 'atom-shell'];
const env = require('./env');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const url = require('url');

// Default config
const defaultConfig = {
  composeBin: env.getComposeExecutable(),
  disablePlugins: [],
  dockerBin: env.getDockerExecutable(),
  dockerBinDir: env.getDockerBinPath(),
  env: process.env,
  home: os.homedir(),
  isArmed: _.includes(['arm64', 'aarch64'], process.arch),
  logLevel: 'debug',
  node: process.version,
  os: {
    type: os.type(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
  },
  pluginDirs: [],
  plugins: [],
  userConfRoot: os.tmpdir(),
};

/*
 * Determine whether we are in a browser or not
 *
 * While setting the config.mode is helpful this is a deeper check so that we
 * know how to handle the process object in things shell attaching, stream piping
 * stdin reading, etc
 *
 * @TODO: We might want to either expand the version checks or maybe do a lower
 * level check of the process file descriptors
 */
const isBrowser = () => _(process.versions)
  .reduce((isBrowser, version, thing) => (isBrowser || _.includes(browsers, thing)), false);

/*
 * @TODO
 */
const setDockerHost = (hostname, port = 2376) => url.format({
  protocol: 'tcp',
  slashes: true,
  hostname,
  port,
});

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

/**
 * Attempt to parse a JSON string to an objects
 *
 * @since 3.0.0
 * @alias lando.utils.config.tryConvertJson
 * @param {String} value The string to convert
 * @return {Object} A parsed object or the inputted value
 */
exports.tryConvertJson = value => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

/**
 * Uses _.mergeWith to concat arrays, this helps replicate how Docker Compose
 * merges its things
 *
 * @see https://lodash.com/docs#mergeWith
 * @since 3.0.0
 * @alias lando.utils.config.merge
 * @param {Object} old object to be merged
 * @param {Object} fresh object to be merged
 * @return {Object} The new object
 * @example
 * // Take an object and write a docker compose file
 * const newObject = _.mergeWith(a, b, lando.utils.merger);
 */
exports.merge = (old, ...fresh) => _.mergeWith(old, ...fresh, (s, f) => {
  if (_.isArray(s)) return _.uniq(s.concat(f));
});

/**
 * Strips process.env of all envvars with PREFIX and returns process.env
 *
 * NOTE: this actually returns process.env not a NEW object cloned from process.env
 *
 * @since 3.0.0
 * @alias lando.utils.config.stripEnv
 * @param {String} prefix - The prefix to strip
 * @return {Object} Updated process.env
 * @example
 * // Reset the process.env without any DOCKER_ prefixed envvars
 * process.env = config.stripEnv('DOCKER_');
 */
exports.stripEnv = prefix => {
  // Strip it down
  _.each(process.env, (value, key) => {
    if (_.includes(key, prefix)) {
      delete process.env[key];
    }
  });

  // Return
  return process.env;
};

/**
 * Define default config
 *
 * @since 3.0.0
 * @alias lando.utils.config.defaults
 * @return {Object} The default config object.
 */
exports.defaults = () => {
  // Also add some info to the process so we can use this elsewhere
  process.lando = (isBrowser()) ? 'browser' : 'node';
  // The default config
  return _.merge(defaultConfig, {process: process.lando});
};

/*
 * @TODO
 */
exports.getEngineConfig = ({engineConfig = {}, env = {}}) => {
  // Set defaults if we have to
  if (_.isEmpty(engineConfig)) {
    engineConfig = {
      socketPath: (process.platform === 'win32') ? '//./pipe/docker_engine' : '/var/run/docker.sock',
      host: '127.0.0.1',
      port: 2376,
    };
  }
  // Set the docker host if its non-standard
  if (engineConfig.host !== '127.0.0.1') env.DOCKER_HOST = setDockerHost(engineConfig.host, engineConfig.port);
  // Set the TLS/cert things if needed
  if (_.has(engineConfig, 'certPath')) {
    env.DOCKER_CERT_PATH = engineConfig.certPath;
    env.DOCKER_TLS_VERIFY = 1;
    env.DOCKER_BUILDKIT = 1;
    engineConfig.ca = fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'ca.pem'));
    engineConfig.cert = fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'cert.pem'));
    engineConfig.key = fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'key.pem'));
  }
  // Return
  return engineConfig;
};


/*
 * @TODO
 */
exports.getOclifCacheDir = (product = 'hyperdrive') => env.getOclifCacheDir(product);

/**
 * Merge in config file if it exists
 *
 * @since 3.5.0
 * @alias lando.utils.config.loadFiles
 * @param {Array} files - An array of files or objects  to try loading
 * @return {Object} An object of config merged from file sources
 */
exports.loadFiles = files => _(files)
  // Filter the source out if it doesn't exist
  .filter(source => fs.existsSync(source) || fs.existsSync(source.file))
  // If the file is just a string lets map it to an object
  .map(source => {
    return _.isString(source) ? {file: source, data: yaml.safeLoad(fs.readFileSync(source))} : source;
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
  .reduce((a, source) => exports.merge(a, source.data), {});

/**
 * Filter process.env by a given prefix
 *
 * @since 3.0.0
 * @alias lando.utils.config.loadEnvs
 * @param {String} prefix - The prefix by which to filter. Should be without the trailing `_` eg `LANDO` not `LANDO_`
 * @return {Object} Object of things with camelCased keys
 */
exports.loadEnvs = prefix => _(process.env)
  // Only muck with prefix_ variables
  .pickBy((value, key) => _.includes(key, prefix))
  // Prep the keys for consumption
  .mapKeys((value, key) => _.camelCase(_.trimStart(key, prefix)))
  // If we have a JSON string as a value, parse that and assign its sub-keys
  .mapValues(exports.tryConvertJson)
  // Resolve the lodash wrapper
  .value();
