'use strict';

/**
 * @file Type definitions for {@link module:utils/apply-tooling-route}.
 */

/**
 * @typedef {object} ToolingRoute
 * @property {string} route - absolute path to the directory this route applies to
 * @property {Object<string, object|boolean|string>} tooling - tooling commands for that directory
 * @property {number} [closeness] - distance from the current working directory, added by core
 */

/**
 * @typedef {object} RoutedTooling
 * @property {ToolingRoute|undefined} route - closest matching route, if any
 * @property {Object<string, object|boolean|string>|undefined} tooling - recipe tooling with route commands applied
 */

module.exports = {};
