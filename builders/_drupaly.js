'use strict';

// Modules
const _ = require('lodash');
const LandoLaemp = require('./_lamp.js');
const semver = require('semver');

// "Constants"
const DRUSH8 = '8.4.8';
const DRUSH7 = '7.4.0';

/*
 * Helper to get DRUSH phar url
 */
const getDrushUrl = version => `https://github.com/drush-ops/drush/releases/download/${version}/drush.phar`;

const drushWarn = version => ({
  title: 'May need site-local drush',
  detail: [
    `Lando has detected you are trying to globally install drush ${version}`,
    'This version of drush prefers a site-local installation',
    'We recommend you install drush that way, see:',
  ],
  url: 'https://www.drush.org/install/',
});

/*
 * Helper to get a phar download and setupcommand
 * @TODO: clean this mess up
 */
const getPhar = (url, src, dest, check = 'true') => {
  // Arrayify the check if needed
  if (_.isString(check)) check = [check];
  // Phar install command
  const pharInstall = [
    ['curl', url, '-LsS', '-o', src],
    ['chmod', '+x', src],
    ['mv', src, dest],
    check,
  ];
  // Return
  return _.map(pharInstall, cmd => cmd.join(' ')).join(' && ');
};

/*
 * Helper to get the phar build command
 */
const getDrush = (version, status) => getPhar(
  getDrushUrl(version),
  '/tmp/drush.phar',
  '/usr/local/bin/drush',
  status,
);

/*
 * Build Drupal 7
 */
module.exports = {
  name: '_drupaly',
  parent: '_recipe',
  config: {
    build: [],
    composer: {},
    confSrc: __dirname,
    config: {},
    database: 'mysql',
    defaultFiles: {
      php: 'php.ini',
    },
    php: '7.2',
    tooling: {drush: {
      service: 'appserver',
    }},
    via: 'apache',
    webroot: '.',
    xdebug: false,
  },
  builder: (parent, config) => class LandoDrupal extends LandoLaemp.builder(parent, config) {
    constructor(id, options = {}) {
      options = _.merge({}, config, options);
      // Set the default drush version if we don't have it
      if (!_.has(options, 'drush')) options.drush = (options.php === '5.3') ? DRUSH7 : DRUSH8;

      // Figure out the drush situation
      if (options.drush !== false) {
        // Start by assuming a composer based install
        options.composer['drush/drush'] = options.drush;
        // Switch to phar based install if we can
        if (semver.valid(options.drush) && semver.major(options.drush) === 8) {
          delete options.composer['drush/drush'];
          options.build.unshift(getDrush(options.drush, ['drush', '--version']));
        }
        // Attempt to set a warning if possible
        const coercedDrushVersion = semver.valid(semver.coerce(options.drush));
        if (!_.isNull(coercedDrushVersion) && semver.gte(coercedDrushVersion, '10.0.0')) {
          options._app.addWarning(drushWarn(options.drush));
        }
      }

      // Merge in what we have for proxy settings so we can pass them downstream
      options.proxy = _.merge({}, options.proxy);
      // Set legacy envars
      options.services = _.merge({}, options.services, {appserver: {overrides: {
        environment: {
          SIMPLETEST_BASE_URL: (options.via === 'nginx') ? 'https://appserver_nginx' : 'https://appserver',
          SIMPLETEST_DB: `mysql://${options.recipe}:${options.recipe}@database/${options.recipe}`,
        },
      }}});
      // Send downstream
      super(id, options);
    };
  },
};
