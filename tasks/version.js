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
  level: 'tasks',
  describe: 'Displays the lando version',
  options: {
    all: {
      describe: 'Show all version information',
      alias: ['a'],
      type: 'boolean',
    },
    component: {
      describe: 'Show version info for specific component',
      alias: ['c'],
      type: 'string',
      default: '@lando/core',
    },
    full: {
      describe: 'Show full version string',
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
