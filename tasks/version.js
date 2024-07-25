'use strict';

const get = require('lodash/get');
const sortBy = require('lodash/sortBy');

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
  usage: '$0 version [--all] [--component <component>] [--full]',
  examples: [
    '$0 version --all',
    '$0 version --full',
    '$0 version --component @lando/cli',
    '$0 version --component cli',
  ],
  level: 'tasks',
  options: {
    all: {
      describe: 'Shows all version information',
      alias: ['a'],
      type: 'boolean',
    },
    component: {
      describe: 'Shows version info for specific component',
      alias: ['c'],
      type: 'string',
      default: '@lando/core',
    },
    full: {
      describe: 'Shows full version string',
      alias: ['f'],
      type: 'boolean',
    },
  },
  run: options => {
    // get UX
    const ux = lando.cli.getUX();
    // normalize component
    options.component = normalize(options.component);
    // start by getting the core version
    const versions = {'@lando/core': `v${lando.config.version}`};

    // if full/all and component = cli then add cli
    if (options.full || options.all || options.component === '@lando/cli') {
      versions['@lando/cli'] = `v${get(lando, 'config.cli.version', lando.config.version)}`;
    }

    // if all or component is non cli/core then also add all our plugin versions
    if (options.all || (options.component !== '@lando/core' && options.component !== '@lando/cli')) {
      const Plugin = require('../components/plugin');
      for (const data of lando.config.plugins) {
        const plugin = new Plugin(data.dir);
        // if we are an internal lando core in packaged dev version then reset any core plugin to match that
        if (lando.config.cli
          && lando.config.cli.dev
          && lando.config.cli.coreBase
          && plugin.package === '@lando/core') {
          plugin.version = lando.config.version;
        }

        // then set the version
        versions[plugin.name] = `v${plugin.version}`;
      }
    }

    // if full then update all versions with their full variant
    if (options.full) {
      const os = `${lando.config.os.platform}-${lando.config.os.arch}`;
      const node = `node-${lando.config.node}`;
      const cli = `cli-${versions['@lando/cli']}`;
      for (const [name, version] of Object.entries(versions)) {
        versions[name] = `${name}/${version} ${os} ${node} ${cli}`;
      }
    }

    // show it all
    if (options.all) {
      const rows = Object.entries(versions).map(([name, version]) => ({name, version}));
      console.log();
      ux.table(sortBy(rows, ['name']), {name: {}, version: {}});
      console.log();
      return;
    }

    // if we get here then just print component version
    console.log(versions[options.component]);
  },
});
