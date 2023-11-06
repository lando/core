'use strict';

const os = require('os');
const path = require('path');

// checks to see if a setting is disabled
module.exports = (plugin, {
  dir = os.tmpdir(),
  Plugin = require('../components/plugin'),
} = {}) => {
  // parse into a full package
  const pkg = require('./parse-package-name')(plugin);

  return {
    title: `Adding ${pkg.raw}`,
    id: `install-${pkg.name}`,
    description: pkg.name,
    isInstalled: async () => {
      const location = pkg.scope === '@lando'
        ? path.join(dir, '@lando', pkg.package) : path.join(dir, pkg.package);

      try {
        const plugin = new Plugin(location);
        return plugin.isInstalled && plugin.isValid;
      } catch {
        return false;
      }
    },
    canInstall: async () => {
      const online = await require('is-online')();
      // throw error if not online
      if (!online) throw new Error('Cannot detect connection to internet!');
      // attempt ti get info on the plugin
      await Plugin.info(plugin);
    },
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
  };
};
