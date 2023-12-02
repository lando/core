'use strict';

module.exports = async (app, lando) => {
  if (lando.config.channel !== 'none' && !lando.cache.get('updates-2')) {
    lando.log.debug('checking for updates...');
    const tasks = await lando.updates.getUpdateTasks();
    // next check in a day
    const expires = Date.now() + 60 * 60 * 24 * 1000;
    lando.log.debug('%s updates available, next check at %s', tasks.length, new Date(expires));
    lando.cache.set('updates-2', {updates: tasks.length, expires}, {persist: true});
  }
};
