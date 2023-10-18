'use strict';

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
  return lando.engine.stop(killRun(run))
  .then(() => lando.engine.destroy(killRun(run)))
  .then(() => lando.Promise.reject(err));
});
