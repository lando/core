'use strict';

const _ = require('lodash');
const path = require('path');

/*
 * Helper to map the cwd on the host to the one in the container
 */
const getContainerPath = (appRoot, appMount = undefined) => {
  // if appmount is undefined then dont even try
  if (appMount === undefined) return undefined;
  // Break up our app root and cwd so we can get a diff
  const cwd = process.cwd().split(path.sep);
  const dir = _.drop(cwd, appRoot.split(path.sep).length);
  // Add our in-container app root
  // this will always be /app
  dir.unshift(appMount);
  // Return the directory
  return dir.join('/');
};

module.exports = (app, command, service, user, env = {}, dir = undefined, appMount = undefined) => ({
  id: app.containers[service],
  compose: app.compose,
  project: app.project,
  cmd: command,
  opts: _.pickBy({
    environment: require('./get-cli-env')(env),
    mode: 'attach',
    workdir: dir || getContainerPath(app.root, appMount),
    user: (user === null) ? require('./get-user')(service, app.info) : user,
    services: _.compact([service]),
    hijack: false,
    autoRemove: true,
  }, _.identity),
});
