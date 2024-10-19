'use strict';

// Modules
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const {color} = require('listr2');

// @TODO: when we have a file for recipes/compose we can set choices on service

module.exports = (lando, config = lando.appConfig) => ({
  command: 'exec',
  describe: 'Runs command(s) on a service',
  usage: '$0 exec <service> [--user <user>] -- <command>',
  override: true,
  level: 'app',
  examples: [
    '$0 exec appserver -- lash bash',
    '$0 exec nginx --user root -- whoami',
    `$0 exec my-service -- "env && echo 'hello there!'"`,
    `$0 exec worker -- "background-service &"`,
  ],
  positionals: {
    service: {
      describe: 'Runs on this service',
      type: 'string',
      choices: config?.allServices ?? _.keys(lando.appConfig.services) ?? [],
    },
  },
  options: {
    user: {
      describe: 'Runs as a specific user',
      alias: ['u'],
    },
  },
  run: async options => {
    // construct a minapp from various places
    const minapp = !_.isEmpty(config) ? config : lando.appConfig;

    // if no app then we need to create one
    if (!fs.existsSync(minapp.composeCache)) {
      const app = lando.getApp(options._app.root);
      await app.init();
    }

    // Build a minimal app
    const AsyncEvents = require('../lib/events');
    const app = lando.cache.get(path.basename(minapp.composeCache));

    // augment
    app.config = minapp;
    app._lando = lando;
    app._config = lando.config;
    app.events = new AsyncEvents(lando.log);

    // Load only what we need so we don't pay the appinit penalty
    if (!_.isEmpty(_.get(app, 'config.events', []))) {
      _.forEach(app.config.events, (cmds, name) => {
        app.events.on(name, 9999, async data => await require('../hooks/app-run-events')(app, lando, cmds, data));
      });
    }

    // nice things
    const aservices = app?.config?.allServices ?? app?.allServices ?? [];
    const choices = `[${color.green('choices:')} ${aservices.map(service => `"${service}"`).join(', ')}]`;

    // gather our options
    options.service = options._[1];
    options.command = options['--'];

    // and validate
    try {
      // no service
      if (!options.service) {
        throw new Error('You must specific a service! See usage above.');
      }

      // not a valid service
      if (!aservices.includes(options.service)) {
        throw new Error(`Service must be one of ${choices}! See usage above.`);
      }

      // empty or nonexistent command
      if (!options.command || options.command.length === 0) {
        throw new Error('You must specify a command! See usage above.');
      }

    // collect, usage throw
    } catch (error) {
      if (options?._yargs?.showHelp) options._yargs.showHelp();
      console.log('');
      throw error;
    }

    // if command is a single thing then lets string argv that
    // this is useful to handle wrapping more complex commands a la "cmd && cmd"
    if (Array.isArray(options.command) && options.command.length === 1) {
      if (require('string-argv')(options.command[0]).length > 1) {
        options.command = ['sh', '-c', options.command[0]];
      }
    }

    // if this service has /etc/lando/exec then prepend
    if (app?.sapis?.[options.service] === 4) options.command.unshift('/etc/lando/exec.sh');

    // spoof options we can pass into build tooling runner
    const ropts = [
      app,
      options.command,
      options.service,
      options.user ?? null,
      {
        DEBUG: lando.debuggy ? '1' : '',
        LANDO_DEBUG: lando.debuggy ? '1' : '',
      },
    ];

    // ensure all v3 services have their appMount set to /app
    // @TODO: do we still need this?
    const v3Mounts = _(_.get(app, 'info', []))
      .filter(service => service.api !== 4)
      .map(service => ([service.service, service.appMount || '/app']))
      .fromPairs()
      .value();
    app.mounts = _.merge({}, v3Mounts, app.mounts);

    // and working dir data if no dir or appMount
    const sconf = app?.config?.services?.[options.service] ?? {};
    ropts.push(sconf?.overrides?.working_dir ?? sconf?.working_dir);
    // mix in mount if applicable
    ropts.push(app?.mounts[options.service]);
    ropts.push(!options.deps ?? false);
    ropts.push(options.autoRemove ?? true);

    // emit pre-exec
    await app.events.emit('pre-exec', config);

    // get tooling runner
    const runner = require('../utils/build-tooling-runner')(...ropts);

    // try to run it
    try {
      lando.log.debug('running exec command %o on %o', runner.cmd, runner.id);
      await lando.engine.run(runner);

    // error
    } catch (error) {
      error.hide = true;
      throw error;

    // finally
    } finally {
      await app.events.emit('post-exec', config);
    }
  },
});

