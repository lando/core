'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

/*
 * Paths to /
 */
const pathsToRoot = (startFrom = process.cwd()) => {
  return _(_.range(path.dirname(startFrom).split(path.sep).length))
    .map(end => _.dropRight(path.dirname(startFrom).split(path.sep), end).join(path.sep))
    .unshift(startFrom)
    .dropRight()
    .value();
};

/*
 * Helper to determine bootstrap level
 */
const getBsLevel = (config, command) => {
  if (_.has(config, `tooling.${command}.level`)) return config.tooling[command].level;
  else if (_.find(config.tooling, {id: command}).level) return _.find(config.tooling, {id: command}).level;
  else return (!fs.existsSync(config.composeCache)) ? 'app' : 'engine';
};

/*
 * Helper to load cached file without cache module
 */
const loadCacheFile = file => {
  try {
    return JSON.parse(JSON.parse(fs.readFileSync(file, {encoding: 'utf-8'})));
  } catch (e) {
    throw new Error(`There was a problem with parsing ${file}. Ensure it is valid JSON! ${e}`);
  }
};

/*
 * Helper to run the app task runner
 */
const appRunner = command => (argv, lando) => {
  const app = lando.getApp(argv._app.root);
  return lando.events.emit('pre-app-runner', app)
  .then(() => lando.events.emit('pre-command-runner', app))
  .then(() => app.init().then(() => _.find(app.tasks, {command}).run(argv)));
};

/*
 * Helper to return the engine task runner
 */
const engineRunner = (config, command) => (argv, lando) => {
  const AsyncEvents = require('./../lib/events');
  // Build a minimal app
  const app = lando.cache.get(path.basename(config.composeCache));
  app.config = config;
  app.events = new AsyncEvents(lando.log);

  // Load only what we need so we don't pay the appinit penalty
  if (!_.isEmpty(_.get(app, 'config.events', []))) {
    _.forEach(app.config.events, (cmds, name) => {
      app.events.on(name, 9999, async data => await require('./../hooks/app-run-events')(app, lando, cmds, data));
    });
  }

  // get tooling
  app.config.tooling = require('./get-tooling-tasks')(app.config.tooling, app);
  // get task
  // @NOTE: can we actually assume this will always find something? i **THINK** we catch upstream?
  const task = _.find(app.config.tooling, task => task.name === command);
  // get service, note this is not trivial because dynamic services are a thing

  const service = !_.startsWith(task.service, ':') ? task.service : argv[_.trim(task.service, ':')];
  lando.log.debug('resolved tooling command %s service to %s', command, service);

  // ensure all v3 services have their appMount set to /app
  const v3Mounts = _(_.get(app, 'info', []))
    .filter(service => service.api !== 4)
    .map(service => ([service.service, service.appMount || '/app']))
    .fromPairs()
    .value();
  app.mounts = _.merge({}, v3Mounts, app.mounts);

  // mix in mount if applicable
  if (!task.dir && _.has(app, `mounts.${service}`)) task.appMount = app.mounts[service];
  // and working dir data if no dir or appMount
  if (!task.dir && !_.has(app, `mounts.${service}`) && _.has(app, `config.services.${service}.working_dir`)) {
    task.dir = app.config.services[service].working_dir;
  }

  // Final event to modify and then load and run
  return lando.events.emit('pre-engine-runner', app)
  .then(() => lando.events.emit('pre-command-runner', app))
  .then(() => require('./build-tooling-task')(task, lando).run(argv));
};

module.exports = (config = {}, argv = {}, tasks = []) => {
  // If we have a tooling router lets rebase on that
  if (fs.existsSync(config.toolingRouter)) {
    // Get the closest route
    const closestRoute = _(loadCacheFile(config.toolingRouter))
      .map(route => _.merge({}, route, {
        closeness: _.indexOf(pathsToRoot(), route.route),
      }))
      .filter(route => route.closeness !== -1)
      .orderBy('closeness')
      .thru(routes => routes[0])
      .value();

    // If we have a closest route lets mod config.tooling
    if (_.has(closestRoute, 'tooling')) {
      config.tooling = _.merge({}, config.tooling, closestRoute.tooling);
      config.route = closestRoute;
    }
  // Or we have a recipe lets rebase on that
  } else if (_.has(config, 'recipe')) {
    config.tooling = _.merge({}, loadCacheFile(config.toolingCache), config.tooling);
  }

  // lets add ids to help match commands with args?
  _.forEach(config.tooling, (task, command) => {
    if (_.isObject(task) && typeof command === 'string') task.id = task.id || command.split(' ')[0];
  });

  // If the tooling command is being called lets assess whether we can get away with engine bootstrap level
  const ids = _(config.tooling).map(task => task.id).filter(_.identity).value();
  const level = (_.includes(ids, argv._[0])) ? getBsLevel(config, argv._[0]) : 'app';

  // Load all the tasks, remember we need to remove "disabled" tasks (eg non-object tasks) here
  _.forEach(_.get(config, 'tooling', {}), (task, command) => {
    if (_.isObject(task)) {
      tasks.push({
        command,
        id: command.split(' ')[0],
        level,
        describe: _.get(task, 'description', `Runs ${command} commands`),
        options: _.get(task, 'options', {}),
        run: (level === 'app') ? appRunner(command) : engineRunner({...config, argv}, command, task),
        delegate: _.isEmpty(_.get(task, 'options', {})),
      });
    }
  });

  // get core tasks
  const coreTasks = _(loadCacheFile(process.landoTaskCacheFile)).map(t => ([t.command, t])).fromPairs().value();

  // and apply any overrides if we have them
  if (fs.existsSync(config.composeCache)) {
    try {
      const composeCache = JSON.parse(fs.readFileSync(config.composeCache, {encoding: 'utf-8'}));
      const overrides = _(_.get(composeCache, 'overrides.tooling', [])).map(t => ([t.command, t])).fromPairs().value();
      _.merge(coreTasks, overrides);
    } catch (e) {
      throw new Error(`There was a problem with parsing ${config.composeCache}. Ensure it is valid JSON! ${e}`);
    }
  }

  // and combine
  return tasks.concat(_.map(coreTasks, task => task));
};
