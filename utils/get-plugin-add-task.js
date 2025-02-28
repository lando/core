'use strict';

const os = require('os');
const path = require('path');

// checks to see if a setting is disabled
module.exports = (plugin, {
  dir = os.tmpdir(),
  Plugin = require('../components/plugin'),
} = {}) => {
  return {
    title: `Adding ${plugin}`,
    id: `install-${plugin}`,
    description: plugin,
    isInstalled: async location => {
      // if we dont have a location then use the information we have to get one
      if (!location) location = path.join(dir, Plugin.getLocation(plugin));

      try {
        const plugin = new Plugin(location);
        return plugin.isInstalled && plugin.isValid;
      } catch {
        return false;
      }
    },
    canInstall: async () => {
      await Plugin.info(plugin);
      return true;
    },
    task: async (ctx, task) => {
      try {
        // add the plugin
        task.plugin = await Plugin.fetch(plugin, {config: Plugin.config, dest: dir});

        // update and and return
        task.title = `Installed ${task.plugin.name}@${task.plugin.version} to ${task.plugin.location}`;
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
