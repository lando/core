'use strict';

const remove = require('../utils/remove');
const path = require('path');

// Helper to kill a run
const killRun = config => ({
  id: config.id,
  compose: config.compose,
  project: config.project,
  opts: {
    purge: true,
    mode: 'attach',
  },
});

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (lando, run) => lando.engine.run(run).catch(err => {
  return lando.Promise.reject(err);
}).finally(() => {
  return lando.engine.stop(killRun(run))
  .then(() => lando.engine.destroy(killRun(run)))
  .then(() => remove(path.dirname(run.compose[0])));
});
