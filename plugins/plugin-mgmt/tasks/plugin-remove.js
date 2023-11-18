'use strict';

module.exports = lando => {
  return {
    command: 'plugin-remove <plugin> [plugins...]',
    run: async options => {
      const Plugin = require('../../../components/plugin');

      // reset Plugin.debug to use the lando 3 debugger
      Plugin.debug = require('../../../utils/debug-shim')(lando.log);

      // merge plugins together, parse/normalize their names and return only unique values
      const plugins = [options.plugin]
        .concat(options.plugins)
        .map(plugin => require('../../../utils/parse-package-name')(plugin).name)
        .filter((plugin, index, array) => array.indexOf(plugin) === index);
      lando.log.debug('attempting to remove plugins %j', plugins);

      // prep listr things
      const tasks = plugins
        .map(plugin => ([lando.config.plugins.find(p => p.name === plugin), plugin]))
        .map(([plugin, fallback]) => require('../utils/get-plugin-remove-task')(plugin, {fallback, Plugin}));

      // try to remove the plugins
      const {added, errors, results} = await lando.runTasks(tasks, {
        ctx: {added: 0},
        renderer: 'lando',
        rendererOptions: {
          level: 0,
        },
      });

      // if we have errors then lets print them out
      if (errors.length > 0) {
        // print the full errors
        for (const error of errors) lando.log.debug(error);
        console.log();
        throw Error('There was a problem removing some of your plugins. Rerun with -vvv for more details.');
      }

      // otherwise we good!
      console.log();
      console.log('removed %s of %s plugins with %s errors', added, results.length, errors.length); // eslint-disable-line max-len
      console.log();
      // clear task caches for good measure
      lando.cli.clearTaskCaches();
    },
  };
};
