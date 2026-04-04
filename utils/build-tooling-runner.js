'use strict';

const _ = require('lodash');
const path = require('path');

const getContainer = (app, service) => {
  const isContainerd = app?.engine?.engineBackend === 'containerd'
    || app?._config?.engineConfig?.containerdMode === true
    || process.env.LANDO_ENGINE === 'containerd';

  if (app?.containers?.[service]) {
    return isContainerd ? app.containers[service].replace(/_/g, '-') : app.containers[service];
  }

  return isContainerd ? `${app.project}-${service}-1` : `${app.project}_${service}_1`;
};

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
  id: getContainer(app, service),
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
