'use strict';

const orderBy = require('lodash/orderBy');

// assumes non-scoped plugins are lando ones
const normalize = name => {
  // if name is not a string then just return false?
  if (typeof name !== 'string') return false;
  // split it
  const parts = name.split('/');
  // if only one part assume its the package
  // @NOTE: is that a good assumption?
  if (parts.length === 1) return ['@lando', parts[0]].join('/');
  // if length is two then reassemble
  else if (parts.length === 2) return parts.join('/');
  // or just return i guess?
  else return name;
};

module.exports = lando => ({
  command: 'version',
  describe: 'Displays lando version information',
  usage: '$0 version [--all] [--full] [--plugin <plugin>]',
  examples: [
    '$0 version --all',
    '$0 version --full',
    '$0 version --plugin @lando/php',
    '$0 version --plugin php',
  ],
  level: 'tasks',
  options: {
    all: {
      describe: 'Shows all version information',
      alias: ['a'],
      type: 'boolean',
    },
    component: {
      hidden: true,
      describe: 'Shows version info for specific component',
      alias: ['c'],
      type: 'string',
      default: 'lando',
    },
    full: {
      describe: 'Shows full version string',
      alias: ['f'],
      type: 'boolean',
    },
    plugin: {
      describe: 'Shows version info for specific plugin',
      alias: ['p'],
      type: 'string',
    },
  },
  run: options => {
    // get UX
    const ux = lando.cli.getUX();

    // if legacy component is set and plugin is not then reset
    if (options.component && !options.plugin) options.plugin = options.component;

    // normalize
    options.plugin = normalize(options.plugin);

    // start by getting the core version
    const versions = {'lando': `v${lando.config.version}`};

    // legacy handling for @lando/core && @lando/cli
    if (options.plugin === '@lando/core' || options.plugin === '@lando/cli' || options.plugin === '@lando/lando') {
      options.plugin = 'lando';
    }

    // if all or component is non cli/core then also add all our plugin versions
    // but do not show core if its coming from CLI
    if (options.all || (options.plugin !== '@lando/core' && options.plugin !== '@lando/cli')) {
      const Plugin = require('../components/plugin');
      for (const data of lando.config.plugins) {
        const plugin = new Plugin(data.dir);
        if (plugin.location !== lando.config.cli.plugin) {
          versions[plugin.name] = `v${plugin.version}`;
        }
      }
    }

    // if full then update all versions with their full variant
    if (options.full) {
      const os = `${lando.config.os.platform}-${lando.config.os.arch}`;
      const node = `node-${lando.config.node}`;
      for (const [name, version] of Object.entries(versions)) {
        const prefix = name === 'lando' ? '' : `${name}/`;
        versions[name] = `${prefix}${version} ${os} ${node}`;
      }
    }

    // show it all
    if (options.all) {
      const rows = Object.entries(versions).map(([name, version]) => ({name, version}));
      console.log();
      ux.table(orderBy(rows, ['name'], ['desc']), {name: {}, version: {}});
      console.log();
      return;
    }

    // if we get here then just print component version
    console.log(versions[options.plugin]);
  },
});
