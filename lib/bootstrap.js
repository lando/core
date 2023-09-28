'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const merger = require('./config').merge;
const path = require('path');
const yaml = require('js-yaml');

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
 * Helper to load landofile
 */
const loadLandoFile = file => {
  try {
    return yaml.safeLoad(fs.readFileSync(file));
  } catch (e) {
    throw new Error(`There was a problem with parsing ${file}. Ensure it is valid YAML! ${e}`);
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
  const AsyncEvents = require('./events');
  // Build a minimal app
  const app = lando.cache.get(path.basename(config.composeCache));
  app.config = config;
  app.events = new AsyncEvents(lando.log);

  // Load only what we need so we don't pay the appinit penalty
  const utils = require('./../plugins/lando-tooling/lib/utils');
  const buildTask = require('./../plugins/lando-tooling/lib/build');
  require('./../plugins/lando-events/app')(app, lando);
  app.config.tooling = utils.getToolingTasks(app.config.tooling, app);
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
  .then(() => buildTask(task, lando).run(argv));
};

/*
 * Helper to traverse up directories from a start point
 */
const traverseUp = file => _(_.range(path.dirname(file).split(path.sep).length))
  .map(end => _.dropRight(path.dirname(file).split(path.sep), end).join(path.sep))
  .map(dir => path.join(dir, path.basename(file)))
  .value();

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
 * Converts landofile things into a configsource
 */
const parseLandofileConfig = (config = {}) => ({
  data: _.pickBy(config, (value, key) => {
    return _.includes(['plugins', 'pluginDirs'], key) && !_.isEmpty(value);
  }),
  file: config.configFiles[0],
  landoFile: true,
});

/*
 * Gets the current env var and returns the key needed for metrics
 */
const getMetricsContext = () => {
  if (_.has(process, 'env.GITPOD_WORKSPACE_ID') || _.has(process, 'env.CODESPACES')) {
    return 'remote';
  } else if ( _.has(process, 'env.CI')) {
    return 'ci';
  } else {
    return 'local';
  }
};

/*
 * Helper to build config
 */
exports.buildConfig = options => {
  // Modules
  const hasher = require('object-hash');
  const helpers = require('./config');

  // Start building the config
  let config = helpers.merge(helpers.defaults(options), options);

  // add the core config.yaml as a config source if we have it, ideally splice it in after the cli config
  // but if we cant then just put it at the beginning
  if (fs.existsSync(path.resolve(__dirname, '..', 'config.yml'))) {
    const splicedex = _.findIndex(config.configSources, element => _.endsWith(element, '/cli/config.yml')) || 0;
    config.configSources.splice(splicedex + 1, 0, path.resolve(__dirname, '..', 'config.yml'));
  }

  // Add in relevant Landofile config to config sources
  // @NOTE: right now this is pretty limited and mostly just so we can accelerate the breakup of the repo
  // Lando 4 will allow all non-bootstrap/compiletime config to be overridden in Landofiles'
  if (!_.isEmpty(config.landoFileConfig)) config.configSources.push(parseLandofileConfig(config.landoFileConfig));

  // If we have configSources let's merge those in as well
  if (!_.isEmpty(config.configSources)) config = helpers.merge(config, helpers.loadFiles(config.configSources));

  // @TODO: app plugin dir gets through but core yml does not?
  // If we have an envPrefix set then lets merge that in as well
  if (_.has(config, 'envPrefix')) config = helpers.merge(config, helpers.loadEnvs(config.envPrefix));
  // special handling for LANDO_PLUGIN_CONFIG
  if (_.keys(config, 'envPrefix')) config = helpers.merge(config, helpers.loadEnvPluginConfig(config.envPrefix));

  // Add some final computed properties to the config
  config.instance = hasher(config.userConfRoot);

  // Strip all DOCKER_ envars
  config.env = helpers.stripEnv('DOCKER_');
  // Set up the default engine config if needed
  config.engineConfig = helpers.getEngineConfig(config);

  // Strip all COMPOSE_ envvars
  config.env = helpers.stripEnv('COMPOSE_');

  // if composeBin is set and orchestratorBin is not set then set one to the other
  if (config.composeBin && !config.orchestratorBin) config.orchestratorBin = config.composeBin;

  // If orchestratorBin is set, is an absolute path and exists then unset orchestratorVersion and rely on this alone
  if (typeof config.orchestratorBin === 'string'
    && path.isAbsolute(config.orchestratorBin)
    && fs.existsSync(config.orchestratorBin)) {
    delete config.orchestratorVersion;
  // Otherwise remove orchestratorBin and rely on orchestratorVersion alone
  } else {
    delete config.orchestratorBin;
  }
  // Add some docker compose protection on windows
  if (process.platform === 'win32') config.env.COMPOSE_CONVERT_WINDOWS_PATHS = 1;
  // Extend the dockercompose timeout limit for future mutagen things
  config.env.COMPOSE_HTTP_TIMEOUT = 300;
  // If orchestratorSeparator is set to '-' and we are using docker-compose 2 then allow that
  config.env.COMPOSE_COMPATIBILITY = config.orchestratorSeparator === '_';

  // Get hyperdrive lando config file location
  config.hconf = path.join(helpers.getOclifCacheDir(config.hyperdrive), `${config.product}.json`);
  // Return the config
  return config;
};

/*
 * Helper for docker compose
 * @TODO: eventually this needs to live somewhere else so we can have a better
 * default engine instantiation
 */
exports.dc = (shell, bin, cmd, {compose, project, opts = {}}) => {
  const dockerCompose = require('./compose');
  const run = dockerCompose[cmd](compose, project, opts);
  return shell.sh([bin].concat(run.cmd), run.opts);
};

/*
 * Helper to load a very basic app
 */
exports.getApp = (files, userConfRoot) => {
  const config = merger({}, ..._.map(files, file => loadLandoFile(file)));
  return _.merge({}, config, {
    configFiles: files,
    metaCache: `${config.name}.meta.cache`,
    project: _.toLower(config.name).replace(/_|-|\.+/g, ''),
    root: path.dirname(files[0]),
    composeCache: path.join(userConfRoot, 'cache', `${config.name}.compose.cache`),
    toolingCache: path.join(userConfRoot, 'cache', `${config.name}.tooling.cache`),
    toolingRouter: path.join(userConfRoot, 'cache', `${config.name}.tooling.router`),
  });
};

/*
 * Helper to find lando files we can use
 */
exports.getLandoFiles = (files = [], startFrom = process.cwd()) => _(files)
  .flatMap(file => traverseUp(path.resolve(startFrom, file)))
  .sortBy().reverse()
  .filter(file => fs.existsSync(file) && path.isAbsolute(file))
  .thru(files => _.isEmpty(files) ? [] : [_.first(files)])
  .flatMap(dirFile => _.map(files, file => path.join(path.dirname(dirFile), file)))
  .filter(file => fs.existsSync(file))
  .value();

/*
 * Helper to parse tasks
 * @NOTE: if this is being run we assume the existence of cacheTasksFile
 * @NOTE: i guess we are not really factoring in whether lando-tooling is disabled or not?
 * @TODO: do we need some validation of the dumped tasks here?
 */
exports.getTasks = (config = {}, argv = {}, tasks = []) => {
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
    task.id = task.id || command.split(' ')[0];
  });

  // If the tooling command is being called lets assess whether we can get away with engine bootstrap level
  const ids = _.map(config.tooling, tooling => tooling.id);
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

/*
 * Helper to setup cache
 */
exports.setupCache = (log, config) => {
  const random = require('uuid/v4');
  const Cache = require('./cache');
  const cache = new Cache({log, cacheDir: path.join(config.userConfRoot, 'cache')});
  if (!cache.get('id')) cache.set('id', random(), {persist: true});
  config.user = cache.get('id');
  config.id = config.user;
  return cache;
};

/*
 * Helper to setup engine
 */
exports.setupEngine = (config, cache, events, log, shell, id) => {
  const Engine = require('./engine');
  const Landerode = require('./docker');
  const LandoDaemon = require('./daemon');
  // get enginey stuff
  const {orchestratorBin, orchestratorVersion, dockerBin, engineConfig} = config;
  const docker = new Landerode(engineConfig, id);
  const daemon = new LandoDaemon(cache, events, dockerBin, log, config.process, orchestratorBin, orchestratorVersion);
  const compose = (cmd, datum) => exports.dc(shell, orchestratorBin, cmd, datum);
  return new Engine(daemon, docker, compose, config);
};

/*
 * Helper to setup metrics
 */
exports.setupMetrics = (log, config) => {
  const Metrics = require('./metrics');
  const command = _.get(config, 'command._', 'unknown');
  return new Metrics({
    log,
    id: config.id,
    endpoints: config.stats,
    data: {
      command: `lando ${command}`,
      context: getMetricsContext(),
      devMode: false,
      instance: config.instance || 'unknown',
      nodeVersion: process.version,
      mode: config.mode || 'unknown',
      os: config.os,
      product: config.product,
      version: config.version,
    },
  });
};
