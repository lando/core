'use strict';

const os = require('os');
const path = require('path');

// checks to see if a setting is disabled
module.exports = (plugin, {
  dir = os.tmpdir(),
  Plugin = require('../components/plugin'),
  source = false,
} = {}) => {
  return {
    title: `Adding ${plugin}`,
    id: `install-${plugin}`,
    description: plugin,
    isInstalled: async () => {
      // parse into a full package
      const pkg = require('./parse-package-name')(plugin);
      // get location
      const location = pkg.scope === '@lando' && !source ? path.join(dir, '@lando', pkg.package) : path.join(dir, pkg.package);

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
        task.plugin = await require('./fetch-plugin')(plugin, {config: Plugin.config, dest: dir, source}, Plugin);
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
