'use strict';

// Modules
const _ = require('lodash');

const {nanoid} = require('nanoid');

// Helper to find the default service
const getDefaultService = (data = {}, defaultService = 'appserver') => {
  // if this is an event built on a service-dynamic command
  if (_.has(data, 'service') && _.startsWith(data.service, ':')) {
    // get the option name
    const option = _.trimStart(data.service, ':');
    // get the argv
    const argv = _.get(data, 'app.config.argv', {});
    // return the argv of the option or its default value
    return _.has(argv, option) ? argv[option] : _.get(data, `options.${option}.default`, defaultService);
  }

  // or if the service is explicitly set by a tooling command
  if (_.has(data, 'service')) return _.get(data, 'service');

  // otherwise just return the default
  return defaultService;
};

// Helper to find a command
const getCommand = cmd => typeof cmd === 'object' ? cmd[getFirstKey(cmd)] : cmd;

// Key find helper
const getFirstKey = obj => _.first(_.keys(obj));

// Helper to find a service
const getService = (cmd, data = {}, defaultService = 'appserver') => {
  return typeof cmd === 'object' ? getFirstKey(cmd) : getDefaultService(data, defaultService);
};

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (cmds, app, data, lando) => _.map(cmds, cmd => {
  // Discover the service
  const service = getService(cmd, data, app._defaultService);

  // compute stdio based on compose major version
  const cstdio = _.get(app, '_config.orchestratorMV', 2) ? 'inherit' : ['inherit', 'pipe', 'pipe'];

  // attempt to ascertain the SAPI
  const sapi = _.get(app, 'v4.services', []).find(s => s.id === service)?.api
    ?? _.get(app, `sapis.${service}`, undefined)
    ?? _.get(data, `sapis.${service}`, undefined);

  // normalize cmd
  cmd = getCommand(cmd);

  // if array then just join it together
  if (_.isArray(cmd)) cmd = cmd.join(' ');

  if ('lando' === service) {
    const yargs = require('yargs');
    const argv = yargs(cmd).parse();
    const $0 = _.pullAt(argv._, [0])[0];
    const toolingTask = _.find(app.tasks, task => $0 === task.command);
    argv._eventArgs = argv._;
    argv.$0 = undefined;
    argv._ = undefined;
    argv._app = app;

    if (undefined === toolingTask) {
      throw new Error('Could not find tooling command: ' + $0);
    }
    return {
      toolingTask,
      answers: argv,
    };
  }

  // lando 4 services
  // @NOTE: lando 4 service events will change once we have a complete hook system
  if (sapi === 4) {
    cmd = ['/etc/lando/exec-multiliner.sh', Buffer.from(cmd, 'utf8').toString('base64')];

  // lando 3
  } else if (sapi === 3) {
    cmd = ['/helpers/exec-multiliner.sh', Buffer.from(cmd, 'utf8').toString('base64')];

  // this should be all "compose-y" services
  } else {
    const file = `/tmp/${nanoid()}.sh`;
    const script = Buffer.from(cmd, 'utf8').toString('base64');
    cmd = `echo ${script} | base64 -d > ${file} && chmod +x ${file} && ${file}`;
  }

  // try to get a list of v4 services a few ways, we have to look at different places because the event could
  // run at various points in the bootstrap
  const v4s = _([
    _(app.info).filter(service => service.api === 4).map('service').value(),
    _.get(app, 'v4.servicesList', []),
  ]).flatten().compact().uniq().value();


  if ('_init' === service) {
    return _.merge(
      {},
      require('./build-init-runner')(_.merge(
        {},
        require('./get-init-runner-defaults')(lando, {destination: app.root, name: app.project, _app: app}),
        {cmd, workdir: '/app'},
      )),
      {isInitEventCommand: true},
    );
  }

  // Validate the service if we can
  // @NOTE fast engine runs might not have this data yet
  if (
    (Array.isArray(app.services) && !_.includes(app.services, service)) &&
    (Array.isArray(v4s) && !_.includes(v4s, service))
  ) {
    throw new Error(`This app has no service called ${service}`);
  }

  // Add the build command
  return {
    id: app.containers[service],
    cmd,
    compose: app.compose,
    project: app.project,
    api: _.includes(v4s, service) ? 4 : 3,
    opts: {
      cstdio,
      mode: 'attach',
      workdir: require('./get-app-mount')(service, app.info),
      user: require('./get-user')(service, app.info),
      services: [service],
      environment: {
        DEBUG: app.debuggy ? '1' : '',
        LANDO_DEBUG: app.debuggy ? '1' : '',
      },
    },
  };
});
