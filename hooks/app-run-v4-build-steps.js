'use strict';

module.exports = async (app, lando) => {
  // @TODO: build locks and hash for v4?
  app.events.on('pre-start', () => async () => await require('./app-purge-v4-build-locks')(app, lando));
  // IMAGE BUILD
  app.events.on('pre-start', 100, async () => await require('./app-run-v4-build-image')(app, lando));
  // APP BUILD
  app.events.on('pre-start', 110, async () => await require('./app-run-v4-build-app')(app, lando));
  // @TODO: POST BUILD/EXEC BUILD
};
