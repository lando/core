'use strict';

module.exports = lando => {
  return {
    command: 'plugin-remove',
    usage: '$0 plugin-remove <plugin> [plugin...]',
    examples: [
      '$0 plugin-remove @lando/php @lando/node',
    ],
    level: 'tasks',
    positionals: {
      plugin: {
        describe: 'Removes these plugins',
        type: 'string',
      },
    },
    run: async options => {
      const Plugin = require('../components/plugin');

      // reset Plugin.debug to use the lando 3 debugger
      Plugin.debug = require('../utils/debug-shim')(lando.log);

      // merge plugins together, parse/normalize their names and return only unique values
      const plugins = options._.slice(1)
        .map(plugin => require('../utils/parse-package-name')(plugin).name)
        .filter((plugin, index, array) => array.indexOf(plugin) === index);
      lando.log.debug('attempting to remove plugins %j', plugins);

      // prep listr things
      const tasks = plugins
        .map(plugin => ([lando.config.plugins.find(p => p.name === plugin), plugin]))
        .map(([plugin, fallback]) => require('../utils/get-plugin-remove-task')(plugin, {fallback, Plugin}));

      // try to remove the plugins
      const {errors, results, total} = await lando.runTasks(tasks, {
        renderer: 'lando',
        rendererOptions: {
          level: 0,
        },
      });

      // otherwise we good!
      console.log();
      console.log('removed %s of %s plugins with %s errors', results.length, total, errors.length); // eslint-disable-line max-len
      console.log();
      // clear task caches for good measure
      lando.cli.clearTaskCaches();

      // if we have errors then lets print them out
      if (errors.length > 0) {
        // print the full errors
        for (const error of errors) lando.log.debug(error);
        throw Error('There was a problem removing some of your plugins. Rerun with -vvv for more details.');
      }
    },
  };
};
