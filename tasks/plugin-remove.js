'use strict';

module.exports = lando => {
  return {
    command: 'pr <plugin> [plugins...]',
    run: async options => {
      const find = require('lodash/find');

      const Plugin = require('../components/plugin');

      // reset Plugin.debug to use the lando 3 debugger
      Plugin.debug = require('../utils/debug-shim')(lando.log);

      // merge plugins together, parse/normalize their names and return only unique values
      const plugins = [options.plugin]
        .concat(options.plugins)
        .map(plugin => require('../utils/parse-package-name')(plugin).name)
        .filter((plugin, index, array) => array.indexOf(plugin) === index);
      lando.log.debug('attempting to remove plugins %j', plugins);

      // prep listr things
      const tasks = plugins.map(plugin => ({
        title: `Removing ${plugin}`,
        task: async (ctx, task) => {
          try {
            // see if this is plugin lando is using
            // @NOTE: you must pass in the plugin name here as lando defines it in lando.config.plugins
            task.plugin = find(lando.config.plugins, {name: plugin});

            // add a short wait for ux purposes
            await require('delay')(Math.floor(Math.random() * 2000));

            // if we cannot find the plugin then error?
            if (!task.plugin) throw Error(`Could not find plugin ${plugin}!`);

            // instantiate plugin and remove
            task.plugin = new Plugin(task.plugin.dir);

            // do not allow removal of core plugins
            if (task.plugin.core) {
              task.skip(`Cannot remove core plugin ${plugin}`);
              return;
            }

            // if we get here tehn we can remove
            task.plugin.remove();

            // update and and return
            task.title = `Removed ${task.plugin.name}@${task.plugin.version} from ${task.plugin.location}`;
            ctx.added++;
            return task.plugin;

          // if we have an error then add it to the status object and throw
          // @TODO: make sure we force remove any errered plugins?
          } catch (error) {
            ctx.errors.push(error);
            throw error;

          // add the plugin regardless of the status
          } finally {
            ctx.plugins.push(task.plugin);
          }
        },
      }));

      // try to remove the plugins
      const results = await lando.runTasks(tasks, {
        ctx: {plugins: [], errors: [], added: 0},
        renderer: 'lando',
        rendererOptions: {
          level: 0,
        },
      });

      // if we have errors then lets print them out
      if (results.errors.length > 0) {
        // print the full errors
        for (const error of results.errors) lando.log.debug(error);
        throw Error('There was a problem removing some of your plugins. Rerun with -vvv for more details.');
      }

      // otherwise we good!
      console.log();
      console.log('removed %s of %s plugins with %s errors', results.added, results.plugins.length, results.errors.length); // eslint-disable-line max-len
      console.log();
      // clear task caches for good measure
      lando.cli.clearTaskCaches();
    },
  };
};
