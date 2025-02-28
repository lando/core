'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = async lando => {
  // load in legacy inits
  await require('./lando-load-legacy-inits')(lando);

  // build the cache
  return lando.Promise.resolve(lando.config.plugins)
    // Make sure the tasks dir exists
    .filter(plugin => fs.existsSync(plugin.tasks))
    // Get a list off full js files that exist in that dir
    .map(plugin => _(fs.readdirSync(plugin.tasks))
      .map(file => path.join(plugin.tasks, file))
      .filter(path => _.endsWith(path, '.js'))
      .value(),
    )
    // Loadem and loggem
    .then(tasks => _.flatten(tasks))
    .each(file => {
      lando.tasks.push({...require(file)(lando, {}), file});
      lando.log.debug('autoloaded global task %s', path.basename(file, '.js'));
    })
    // Reset the task cache
    .then(() => {
      lando.cache.set('_.tasks.cache', JSON.stringify(lando.tasks), {persist: true});
    });
};
