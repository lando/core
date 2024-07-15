'use strict';

module.exports = lando => {
  return {
    command: 'plugin-login',
    usage: '$0 plugin-login [--username <username>] [--password <password>] [--registry <registry>]',
    examples: [
      '$0 plugin-login --username riker --password "$TOKEN"',
      '$0 plugin-login --registry https://npm.pkg.github.com',
    ],
    level: 'tasks',
    options: {
      username: {
        describe: 'Sets the registry username',
        alias: ['u'],
        string: true,
        interactive: {
          type: 'string',
          message: 'Enter registry username',
          weight: 100,
          validate: input => {
            return typeof input === 'string' && input.length > 0 ? true : 'Must enter a username!';
          },
        },
      },
      password: {
        describe: 'Sets the registry password',
        alias: ['p'],
        string: true,
        interactive: {
          type: 'password',
          message: 'Enter registry password or token',
          weight: 200,
          validate: input => {
            return typeof input === 'string' && input.length > 0 ? true : 'Must enter a password or token!';
          },
        },
      },
      registry: {
        describe: 'Sets registry',
        alias: ['r'],
        string: true,
        default: 'https://registry.npmjs.org',
      },
      scope: {
        describe: 'Sets scopes',
        alias: ['s'],
        array: true,
      },
    },
    run: async options => {
      const merge = require('lodash/merge');
      const profile = require('npm-profile');
      const getPluginConfig = require('../utils/get-plugin-config');
      const lopts2Popts = require('../utils/lopts-2-popts');
      const write = require('../utils/write-file');

      const {color} = require('listr2');

      // get relevant options
      const {username, password, registry} = options;

      // try to login
      try {
        // @NOTE: it also return ok=true? can it sometimes be not ok?
        const {token} = await profile.loginCouch(username, password, {registry});

        // assemble and write new plugin configFile
        const data = merge({}, getPluginConfig(lando.config.pluginConfigFile), lopts2Popts({...options, auth: [`${registry}=${token}`]})); // eslint-disable-line max-len
        write(lando.config.pluginConfigFile, data);
        lando.log.debug('wrote plugin config to %s', lando.config.pluginConfigFile);

        // tell the user what happened
        console.log(`${color.green(username)} is now ${color.bold('logged in')} to ${color.magenta(registry)}!`);

      // handle login errors
      } catch (error) {
        // debug the original error
        lando.log.debug('original error %j', error);
        // for some reason not all errors have a non-zero code so enforce here
        error.code = 1;
        // malformed URL
        if (error.code === 'ERR_INVALID_URL') error.message = `${registry} does not appear to be a valid registry URL!`;
        // @TODO? other non HTTP errors?

        // if we have a http status code then so we can reliably do some things
        if (error.statusCode) {
          error.message = `${error.body.error}`;
          lando.log.debug('%s request failed to %s with status code %s', error.method, error.uri, error.statusCode);
          throw error;

        // otherwise just throw and be done with it
        } else throw error;
      }
    },
  };
};
