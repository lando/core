'use strict';

const _ = require('lodash');
const path = require('path');

/*
 * Paths to /
 *
 * @param {string} startFrom directory to start from
 * @return {string[]} the start directory and its ancestors, excluding the empty root entry
 */
const pathsToRoot = startFrom => {
  return _(_.range(path.dirname(startFrom).split(path.sep).length))
    .map(end => _.dropRight(path.dirname(startFrom).split(path.sep), end).join(path.sep))
    .unshift(startFrom)
    .dropRight()
    .value();
};

// @NOTE: valid-jsdoc does not understand typescript import types
/* eslint-disable valid-jsdoc */
/**
 * Apply the closest tooling route to a recipe's tooling
 *
 * @param {Object<string, object|boolean|string>} tooling recipe tooling
 * @param {import('./apply-tooling-route.types').ToolingRoute[]} [routes] per-directory tooling routes
 * @param {string} [cwd] directory used to determine route closeness
 * @return {import('./apply-tooling-route.types').RoutedTooling} closest route and tooling with its commands applied
 */
/* eslint-enable valid-jsdoc */
const applyToolingRoute = (tooling, routes = [], cwd = process.cwd()) => {
  const paths = pathsToRoot(cwd);
  const closest = _(routes)
    .map(route => _.merge({}, route, {closeness: _.indexOf(paths, route.route)}))
    .filter(route => route.closeness !== -1)
    .orderBy('closeness')
    .head();

  // routes without tooling do not count
  if (!_.has(closest, 'tooling')) return {route: undefined, tooling};

  // route commands replace recipe commands whole, including false disable markers
  return {route: closest, tooling: {...tooling, ...closest.tooling}};
};

module.exports = applyToolingRoute;
