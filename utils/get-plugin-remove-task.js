'use strict';

// checks to see if a setting is disabled
module.exports = (plugin, {
  fallback = 'unknown plugin',
  Plugin = require('../components/plugin'),
} = {}) => {
  const name = plugin && plugin.name ? plugin.name : fallback;
  return {
    title: `Removing ${name}`,
    task: async (ctx, task) => {
      try {
        // add a short wait for ux purposes
        await require('delay')(Math.floor(Math.random() * 2000));

        // if we cannot find the plugin then error?
        if (!plugin) throw Error(`Could not find plugin ${name}!`);

        // instantiate plugin and remove
        task.plugin = new Plugin(plugin.dir);

        // do not allow removal of core plugins
        if (task.plugin.core) {
          task.skip(`Cannot remove core plugin ${task.plugin.name}`);
          return;
        }

        // if we get here tehn we can remove
        task.plugin.remove();

        // update and and return
        task.title = `Removed ${task.plugin.name}@${task.plugin.version} from ${task.plugin.location}`;
        ctx.results.push(task.plugin);
        return task.plugin;

      // if we have an error then add it to the status object and throw
      // @TODO: make sure we force remove any errered plugins?
      } catch (error) {
        error.plugin = task.plugin;
        ctx.errors.push(error);
        throw error;
      }
    },
  };
};
