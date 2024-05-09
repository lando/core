'use strict';

const _ = require('lodash');
const browsers = ['electron', 'chrome', 'atom-shell'];
const path = require('path');
const os = require('os');

// Default config
const defaultConfig = options => ({
  orchestratorSeparator: '_',
  orchestratorVersion: '2.27.0',
  configSources: [],
  disablePlugins: [],
  dockerBin: require('../utils/get-docker-x')(),
  dockerBinDir: require('../utils/get-docker-bin-path')(),
  env: process.env,
  home: os.homedir(),
  isArmed: _.includes(['arm64', 'aarch64'], process.arch),
  logLevel: 'debug',
  node: process.version,
  os: {
    type: os.type(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    isWsl: os.release().toLowerCase().includes('microsoft'),
  },
  pluginDirs: [{path: path.join(__dirname, '..'), subdir: 'plugins', namespace: '@lando'}],
  plugins: [{name: '@lando/core', path: path.join(__dirname, '..'), type: 'local'}],
  userConfRoot: os.tmpdir(),

  // this governs both autosetup and the defaults of lando setup
  // @TODO: orchestrator works a bit differently because it predates lando.setup() we set it elsewhere
  setup: {
    buildEngine: process.platform === 'linux' ? '26.1.1' : '4.30.0',
    buildEngineAcceptLicense: !require('is-interactive')(),
    commonPlugins: {
      '@lando/acquia': 'latest',
      '@lando/apache': 'latest',
      '@lando/backdrop': 'latest',
      '@lando/compose': 'latest',
      '@lando/dotnet': 'latest',
      '@lando/drupal': 'latest',
      '@lando/elasticsearch': 'latest',
      '@lando/go': 'latest',
      '@lando/joomla': 'latest',
      '@lando/lagoon': 'latest',
      '@lando/lamp': 'latest',
      '@lando/laravel': 'latest',
      '@lando/lemp': 'latest',
      '@lando/mailhog': 'latest',
      '@lando/mariadb': 'latest',
      '@lando/mean': 'latest',
      '@lando/memcached': 'latest',
      '@lando/mongo': 'latest',
      '@lando/mssql': 'latest',
      '@lando/mysql': 'latest',
      '@lando/nginx': 'latest',
      '@lando/node': 'latest',
      '@lando/pantheon': 'latest',
      '@lando/php': 'latest',
      '@lando/phpmyadmin': 'latest',
      '@lando/platformsh': 'latest',
      '@lando/postgres': 'latest',
      '@lando/python': 'latest',
      '@lando/redis': 'latest',
      '@lando/ruby': 'latest',
      '@lando/solr': 'latest',
      '@lando/symfony': 'latest',
      '@lando/tomcat': 'latest',
      '@lando/varnish': 'latest',
      '@lando/wordpress': 'latest',
    },
    installPlugins: true,
    installTasks: true,
    plugins: {},
    tasks: [],
    skipCommonPlugins: _.get(options, 'fatcore', false),
  },
});

/*
 * Determine whether we are in a browser or not
 *
 * While setting the config.mode is helpful this is a deeper check so that we
 * know how to handle the process object in things shell attaching, stream piping
 * stdin reading, etc
 *
 * @TODO: We might want to either expand the version checks or maybe do a lower
 * level check of the process file descriptors
 */
const isBrowser = () => _(process.versions)
  .reduce((isBrowser, version, thing) => (isBrowser || _.includes(browsers, thing)), false);

module.exports = options => {
  // Also add some info to the process so we can use this elsewhere
  process.lando = (isBrowser()) ? 'browser' : 'node';
  // The default config
  return _.merge(defaultConfig(options), {process: process.lando});
};
