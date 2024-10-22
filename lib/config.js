'use strict';

/**
 * Define default config
 *
 * @since 3.18.1
 * @alias lando.utils.config.defaults
 * @param {Object} options object of options
 * @return {Object} The default config object.
 */
exports.defaults = (...args) => require('../utils/get-config-defaults')(...args);

/*
 * @TODO
 */
exports.getEngineConfig = (...args) => require('../utils/get-engine-config')(...args);

/*
 * @TODO
 */
exports.getOclifCacheDir = (...args) => require('../utils/get-cache-dir')(...args);

/**
 * Filter process.env by a given prefix
 *
 * @since 3.0.0
 * @alias lando.utils.config.loadEnvs
 * @param {String} prefix - The prefix by which to filter. Should be without the trailing `_` eg `LANDO` not `LANDO_`
 * @return {Object} Object of things with camelCased keys
 */
exports.loadEnvs = (...args) => require('../utils/load-env')(...args);

/**
 * Merge in config file if it exists
 *
 * @since 3.5.0
 * @alias lando.utils.config.loadFiles
 * @param {Array} files - An array of files or objects  to try loading
 * @return {Object} An object of config merged from file sources
 */
exports.loadFiles = (...args) => require('../utils/load-config-files')(...args);

/*
 * helper to inject pluginConfig set in envvars
 * this is not really great but its a "new feature" so we can get some sort of plugin management into lando 3
 */
exports.loadEnvPluginConfig = (...args) => require('../utils/load-env-plugin-config')(...args);

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
exports.merge = (...args) => require('../utils/legacy-merge')(...args);

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
exports.stripEnv = (...args) => require('../utils/strip-env')(...args);

/**
 * Attempt to parse a JSON string to an objects
 *
 * @since 3.0.0
 * @alias lando.utils.config.tryConvertJson
 * @param {String} value The string to convert
 * @return {Object} A parsed object or the inputted value
 */
exports.tryConvertJson = (...args) => require('../utils/try-convert-json')(...args);
