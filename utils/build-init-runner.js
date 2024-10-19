'use strict';

module.exports = config => ({
  id: config.id,
  compose: config.compose,
  project: config.project,
  cmd: config.cmd,
  opts: {
    mode: 'attach',
    user: config.user,
    services: ['init'],
    autoRemove: config.remove,
    workdir: config.workdir,
    prestart: config.prestart,
  },
});
