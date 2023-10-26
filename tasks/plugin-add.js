'use strict';

module.exports = lando => {
  return {
    command: 'pa <plugin> [plugins...]',
    options: {
      auth: {
        describe: 'Sets auth globally or to a scope',
        alias: ['a'],
        array: true,
        default: [],
      },
      registry: {
        describe: 'Sets registry globally or to a scope',
        alias: ['r', 's', 'scope'],
        array: true,
        default: [],
      },
    },

    run: async options => {
      const find = require('lodash/find');
      const merge = require('lodash/merge');
      const config2Lopts = require('../utils/config-2-lopts');
      const lopts2Popts = require('../utils/lopts-2-popts');

      const Plugin = require('../components/plugin');

      // @TODO: get npmrc stuff?
      // @TODO: test lando-plugin-spark

      // we need to merge various Plugin config soruces together to set the plugin config
      // lets start with getting stuff directly from lando.config
      options.config = lopts2Popts(config2Lopts(lando.config.pluginConfig));
      // lets merge passed in options on top of lopts
      options.config = lopts2Popts(options, options.config);
      // finanly lets rebase ontop of any npm config we may have
      options.config = merge({}, options.config);

      // reset Plugin static defaults for v3 purposes
      Plugin.config = options.config;
      Plugin.debug = require('../utils/debug-shim')(lando.log);

      // merge plugins together
      const plugins = [options.plugin].concat(options.plugins);
      lando.log.debug('attempting to install plugins %j', plugins);

      // prep listr things
      const tasks = plugins.map(plugin => ({
        title: `Adding ${plugin}`,
        task: async (ctx, task) => {
          try {
            // attempt to compute the destination to install the plugin
            // @NOTE: is it possible for this to ever be undefined?
            const {dir} = find(lando.config.pluginDirs, {type: require('../utils/get-plugin-type')(plugin)});

            // add the plugin
            task.plugin = await require('../utils/fetch-plugin')(plugin, {config: Plugin.config, dest: dir}, Plugin);

            // update and and return
            task.title = `Installed ${task.plugin.name}@${task.plugin.version}`;
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

      // try to fetch the plugins
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
        throw Error('There was a problem installing some of your plugins. Rerun with -vvv for more details.');
      }

      // otherwise we good!
      console.log();
      console.log('added %s of %s plugins with %s errors', results.added, results.plugins.length, results.errors.length); // eslint-disable-line max-len
      console.log();
      // clear task caches for good measure
      lando.cli.clearTaskCaches();
    },
  };
};
