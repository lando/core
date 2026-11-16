'use strict';

const _ = require('lodash');

/**
 * Turn tooling config into tooling tasks, skipping disabled (non-object) commands like the warm path does.
 *
 * @param {Object<string, object|boolean|string>} config tooling config keyed by command
 * @param {object} app the app the tasks run against
 * @return {object[]} tooling tasks with their app and name
 */
module.exports = (config, app) => _(config)
  .pickBy(_.isObject)
  .map((task, name) => _.merge({}, task, {app, name}))
  .value();
