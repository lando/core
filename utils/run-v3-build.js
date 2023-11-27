'use strict';

// Modules
const _ = require('lodash');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (app, steps, lockfile, hash = 'YOU SHALL NOT PASS') => {
  if (!_.isEmpty(steps) && !app._lando.cache.get(lockfile)) {
    app.log.info('running build steps...');
    return app.engine.run(steps)
    // Save the new hash if everything works out ok
    .then(() => {
      app._lando.cache.set(lockfile, hash, {persist: true});
      app.log.info('build steps completed. and locked with %s', lockfile);
    })
    // Make sure we don't save a hash if our build fails
    .catch(error => {
      app.addMessage({
        title: `One of your v3 build steps failed`,
        type: 'warning',
        detail: [
          'This **MAY** prevent your app from working.',
          'Check for errors above, fix them in your Landofile, and try again by running:',
        ],
        command: 'lando rebuild',
      }, error);
    });
  }
};
