'use strict';

const os = require('os');

// checks to see if a setting is disabled
module.exports = (plugin, {
  dir = os.tmpdir(),
  Plugin = require('../components/plugin'),
} = {}) => ({
  title: `Adding ${plugin}`,
  task: async (ctx, task) => {
    try {
      // add the plugin
      task.plugin = await require('../utils/fetch-plugin')(plugin, {config: Plugin.config, dest: dir}, Plugin);

      // update and and return
      task.title = `Installed ${task.plugin.name}@${task.plugin.version} to ${task.plugin.location}`;
      ctx.added++;

      return task.plugin;

    // if we have an error then add it to the status object and throw
    // @TODO: make sure we force remove any errered plugins?
    } catch (error) {
      ctx.errors.push(error);
      throw error;

    // add the plugin regardless of the status
    } finally {
      ctx.results.push(task.plugin);
    }
  },
});
