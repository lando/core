'use strict';

module.exports = async (app, lando) => {
  // Add URL scan checks
  app.events.on('post-start', 10, async () => await require('./hooks/app-add-url-scans')(app, lando));
};
