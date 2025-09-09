'use strict';

const _ = require('lodash');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

// Bootstrap levels
const BOOTSTRAP_LEVELS = {
  config: 1,
  tasks: 2,
  engine: 3,
  app: 4,
};

// Default version information
const DEFAULT_VERSIONS = {networking: 1};

// Helper to resolve setup tasks for uniqueness and these things
const resolveSetupTasks = (tasks = []) => {
  tasks = _.uniqBy(tasks, task => {
    if (task.multiple === true) return Math.random();
    else return task.id;
  });

  return tasks;
};

/*
 * Helper to bootstrap plugins
 */
const bootstrapConfig = async lando => {
  const Plugins = require('./plugins');
  lando.plugins = new Plugins(lando.log);
  lando.versions = _.merge({}, DEFAULT_VERSIONS, lando.cache.get('versions'));

  // Disable the alliance plugin unless certain conditions are met
  if (lando.config.packaged || !lando.config.alliance) lando.config.disablePlugins.push('lando-alliance');
  // Load in experimental features
  if (lando.config.experimental) {
    const experimentalPluginPath = path.join(__dirname, '..', 'experimental');
    lando.config.pluginDirs.push({path: experimentalPluginPath, subdir: '.'});
  }

  // Find the plugins
  const plugins = lando.plugins.find(lando.config.pluginDirs, lando.config);

  // if we dont have core in this list somewhere that is a huge mistake and lets make sure we load it
  if (!plugins.find(plugin => plugin.name === '@lando/core')) {
    // ensure coreBase is set
    lando.config.coreBase = lando.config.coreBase ?? path.resolve(__dirname, '..');
    lando.log.debug('no core detected loading from %o', lando.config.coreBase);

    // core
    const core = {
      name: '@lando/core',
      path: path.join(lando.config.coreBase, 'index.js'),
      dir: lando.config.coreBase,
    };

    // put at the begining
    plugins.unshift(_.merge({}, core, lando.plugins.discover(core)));
  }

  // loop through plugins and load them
  for await (const p of plugins) {
    // load ig
    const plugin = await lando.plugins.load(p, p.path, lando);
    // Merge in config if we can
    if (_.has(plugin, 'data.config')) lando.config = _.merge(plugin.data.config, lando.config);

    // Add plugins to config
    // @NOTE: we remove plugin.data here because circular ref error and because presumably that
    // data is now expessed directly in the lando object somewhere
    lando.config.plugins.push(_.omit(plugin, 'data'));
  }

  // make sure we remove duplicate "local" plugins so lando.config does not show them twice
  const removed = _.remove(lando.config.plugins, plugin => {
    if (plugin.type === 'local') return _.size(_.filter(lando.config.plugins, p => p.name === plugin.name)) > 1;
    return false;
  });

  // log
  if (!_.isEmpty(removed)) lando.log.debug('removed duplicate plugin entries %o', removed);

  // he who remains
  return plugins;
};

/*
 * Helper to bootstrap tasks
 */
const bootstrapTasks = async lando => {
  // if we already have cached tasks tehn load that
  if (!lando.cache.get('_.tasks.cache')) await require('../hooks/lando-generate-tasks-cache')(lando);
  // push it
  lando.tasks.push(...JSON.parse(lando.cache.get('_.tasks.cache')));
};

/*
 * Helper to bootstrap engine
 */
const bootstrapEngine = lando => {
  const Shell = require('./shell');
  lando.shell = new Shell(lando.log);
  lando.scanUrls = require('../utils/legacy-scan')(lando.log);
  lando.engine = require('../utils/setup-engine')(
    lando.config,
    lando.cache,
    lando.events,
    lando.log,
    lando.shell,
    lando.config.instance,
  );
  lando.utils = _.merge({}, require('./utils'), require('./config'));

  // if we have not wiped the scripts dir to accomodate https://github.com/docker/for-mac/issues/6614#issuecomment-1382224436
  // then lets do that here
  if (!lando.cache.get('VIRTUOFSNUKE1')) {
    const {rimrafSync} = require('rimraf');
    rimrafSync(path.join(lando.config.userConfRoot, 'scripts'));
    lando.cache.set('VIRTUOFSNUKE1', 'yes', {persist: true});
  }
};

/*
 * Helper to bootstrap app stuffs
 */
const bootstrapApp = lando => {
  const Factory = require('./factory');
  const Yaml = require('./yaml');
  lando.factory = new Factory();
  lando.yaml = new Yaml(lando.log);

  // start with legacy builder discovery
  const legacyBuilders = _(['compose', 'types', 'services', 'recipes'])
    .flatMap(type => _.map(lando.config.plugins, plugin => plugin[type]))
    .filter(dir => fs.existsSync(dir))
    .flatMap(dir => glob.sync(path.join(dir, '*', 'builder.js')))
    .map(file => lando.factory.add(file).name)
    .value();
  _.forEach(legacyBuilders, builder => lando.log.debug('autoloaded legacy builder %s', builder));

  // then move to legacy builders we can lazy load from builders
  const legacyItems = _(['builders'])
    .flatMap(type => _.map(lando.config.plugins, plugin => plugin[type]))
    .filter(dir => fs.existsSync(dir))
    .flatMap(dir => fs.readdirSync(dir).map(file => path.join(dir, file)))
    .map(file => lando.factory.add(file))
    .value();
  _.forEach(legacyItems, ({name, api}) => lando.log.debug('autodiscovered legacy api %s builder %s', api, name));

  // @TODO: when we have new 4ish services/recipes we need to do below
  // @TODO: load all non builder.js files in the "services" directory
  // @TODO: load all non builder.js files in the "recipes" directory
};

/*
 * Helper to route bootstrap things
 */
const bootstrapRouter = async (level, lando) => {
  switch (level) {
    case 'config': return await bootstrapConfig(lando);
    case 'tasks': return bootstrapTasks(lando);
    case 'engine': return bootstrapEngine(lando);
    case 'app': return bootstrapApp(lando);
    default: return true;
  }
};

/**
 * The class to instantiate a new Lando
 *
 * Generally you will not need to do this unless you are using Lando to build your own
 * interface.
 *
 * Check out `./bin/lando.js` in this repository for an example of how we instantiate
 * `lando` for usage in a CLI.
 *
 * @since 3.0.0
 * @name Lando
 * @param {Object} [options] Options to initialize a Lando object with
 * @return {Lando} An initialized Lando instance
 * @example
 * // Get a new lando instance
 * const Lando = require('lando');
 * const lando = new Lando({
 *   logLevelConsole: LOGLEVELCONSOLE,
 *   userConfRoot: USERCONFROOT,
 *   envPrefix: ENVPREFIX,
 *   configSources: configSources,
 *   pluginDirs: [USERCONFROOT],
 *   mode: 'cli'
 * });
 */
module.exports = class Lando {
  constructor(options = {}) {
    const getPluginConfig = require('../utils/get-plugin-config');

    this.BOOTSTRAP_LEVELS = BOOTSTRAP_LEVELS;
    this.config = require('../utils/build-config')(options);
    this.Promise = require('./promise');
    this.tasks = [];
    const AsyncEvents = require('./events');
    const Log = require('./logger');
    const ErrorHandler = require('./error');
    const UpdateManager = require('./updates');
    this.cache = require('../utils/setup-cache')(this.log, this.config);
    this.log = new Log(this.config);
    this.metrics = require('../utils/setup-metrics')(this.log, this.config);
    this.error = new ErrorHandler(this.log, this.metrics),
    this.events = new AsyncEvents(this.log);
    this.user = require('./user');

    // updater is more complex now
    this.updates = new UpdateManager({
      agent: this.config.userAgent,
      channel: this.config.channel,
      cli: _.get(this, 'config.cli'),
      config: getPluginConfig(this.config.pluginConfigFile, this.config.pluginConfig),
      debug: require('../utils/debug-shim')(this.log),
    });

    // helper just to determine whether we are "debuggy" or not
    this.debuggy = this.config.logLevelConsole > 2
      || this.config.logLevelConsole === 'verbose'
      || this.config.logLevelConsole === 'debug'
      || this.config.logLevelConsole === 'silly';
  }

  /**
   * Bootstraps Lando, this should
   *
   *  1. Emit bootstrap events
   *  2. Auto detect and then load any plugins
   *  3. Augment the lando object with additional methods
   *
   * You will want to use this after you instantiate `lando` via `new Lando(config)`. There
   * are four available bootstrap levels and each provides different things. The run in
   * the order presented.
   *
   *      config     Autodetects and loads any plugins and merges their returns into
   *                 the global config
   *
   *      tasks      Autodetects and loads in any tasks along with recipe inits and
   *                 init sources
   *
   *      engine     Autodetects and moves any plugin scripts, adds `engine`, `shell`,
   *                 `scanUrls` and `utils` to the lando instance
   *
   *      app        Autodetects and loads in any `services` and `recipes` and also adds `yaml
   *                 and `factory` to the lando instance.
   *
   * Check out `./bin/lando.js` in this repository for an example of bootstraping
   * `lando` for usage in a CLI.
   *
   * @since 3.0.0
   * @alias lando.bootstrap
   * @fires pre_bootstrap_config
   * @fires pre_bootstrap_tasks
   * @fires pre_bootstrap_engine
   * @fires pre_bootstrap_app
   * @fires post_bootstrap_config
   * @fires post_bootstrap_tasks
   * @fires post_bootstrap_engine
   * @fires post_bootstrap_app
   * @param {String} [level=app] Level with which to bootstrap Lando
   * @return {Promise} A Promise
   * @example
   * // Bootstrap lando at default level and then exit
   * lando.bootstrap().then(() => process.exit(0))l
   */
  bootstrap(level = 'app') {
    // Log that we've begun
    this.log.verbose('starting bootstrap at level %s...', level);
    this.log.silly('it\'s not particularly silly, is it?');

    // @TODO TEST THE BELOW BIG TIMEZ
    const bootstraps = _.slice(_.keys(BOOTSTRAP_LEVELS), 0, BOOTSTRAP_LEVELS[level]);

    // Loop through our bootstrap levels
    return this.Promise.each(bootstraps, level => {
      this.log.verbose('%s bootstrap beginning...', level);
      this._bootstrap = level;
      this._bootstrapLevel = this.BOOTSTRAP_LEVELS[level];

      /**
       * Event that runs before we bootstrap config.
       *
       * @since 3.0.0
       * @alias lando.events:pre-bootstrap-config
       * @event pre_bootstrap_config
       * @property {Lando} lando The lando object
       * @example
       * lando.events.on('pre-bootstrap-config', lando => {
       *   // My codes
       * });
       */
      /**
       * Event that runs before we bootstrap tasks.
       *
       * @since 3.0.0
       * @alias lando.events:pre-bootstrap-tasks
       * @event pre_bootstrap_tasks
       * @property {Lando} lando The lando object
       * @example
       * lando.events.on('pre-bootstrap-tasks', lando => {
       *   // My codes
       * });
       */
      /**
       * Event that runs before we bootstrap the engine.
       *
       * @since 3.0.0
       * @alias lando.events:pre-bootstrap-engine
       * @event pre_bootstrap_engine
       * @property {Lando} lando The lando object
       * @example
       * lando.events.on('pre-bootstrap-engine', lando => {
       *   // My codes
       * });
       */
      /**
       * Event that runs before we bootstrap the app.
       *
       * @since 3.0.0
       * @alias lando.events:pre-bootstrap-app
       * @event pre_bootstrap_app
       * @property {Lando} lando The lando object
       * @example
       * lando.events.on('pre-bootstrap-app', lando => {
       *   // My codes
       * });
       */
      return this.events.emit(`pre-bootstrap-${level}`, this)

      // Call the things that should happen at each level
      .then(() => bootstrapRouter(level, this))

      /**
       * Event that runs after we bootstrap config
       *
       * @since 3.0.0
       * @alias lando.events:post-bootstrap-config
       * @event post_bootstrap_config
       * @property {Lando} lando The Lando object
       * @example
       * lando.events.on('post-bootstrap-config', lando => {
       *   // My codes
       * });
       */
      /**
       * Event that runs after we bootstrap tasks
       *
       * @since 3.0.0
       * @alias lando.events:post-bootstrap-tasks
       * @event post_bootstrap_tasks
       * @property {Lando} lando The Lando object
       * @example
       * lando.events.on('post-bootstrap-tasks', lando => {
       *   // My codes
       * });
       */
      /**
       * Event that runs after we bootstrap the engine
       *
       * @since 3.0.0
       * @alias lando.events:post-bootstrap-engine
       * @event post_bootstrap_engine
       * @property {Lando} lando The Lando object
       * @example
       * lando.events.on('post-bootstrap-engine', lando => {
       *   // My codes
       * });
       */
      /**
       * Event that runs after we bootstrap the app
       *
       * @since 3.0.0
       * @alias lando.events:post-bootstrap-app
       * @event post_bootstrap_app
       * @property {Lando} lando The Lando object
       * @example
       * lando.events.on('post-bootstrap-app', lando => {
       *   // My codes
       * });
       */
      .then(() => this.events.emit(`post-bootstrap-${level}`, this))
      // Log the doneness
      .then(() => this.log.verbose('%s bootstrap completed.', level));
    })
    .then(() => this.log.verbose('bootstrap completed.'))
    .then(() => this.events.emit(`post-bootstrap`, this))
    .then(() => this.events.emit(`almost-ready`, this))
    .then(() => this.events.emit(`ready`, this))
    .then(() => this);
  }

  async generateCert(name, {
    caCert = this.config.caCert,
    caKey = this.config.caKey,
    domains = [],
    organization = 'Lando Alliance',
    validity = 365,
  } = {}) {
    const read = require('../utils/read-file');
    const write = require('../utils/write-file');
    const {createCert} = require('mkcert');

    // compute
    const certPath = path.join(this.config.userConfRoot, 'certs', `${name}.crt`);
    const keyPath = path.join(this.config.userConfRoot, 'certs', `${name}.key`);
    // push localhost and 127.0.0.1 to domains
    domains.push('127.0.0.1', 'localhost');
    this.log.debug('received cert request for %o with names %j using CA %o', name, domains, caCert);

    // generate cert
    const {cert, key} = await createCert({
      ca: {
        cert: read(caCert),
        key: read(caKey),
      },
      domains,
      organization,
      validity,
    });

    // write
    // @NOTE: we just regenerate every single time because the logic is easier since things are dyanmic
    // and, presumably the cost is low?
    write(certPath, cert);
    write(keyPath, key);
    this.log.debug('generated cert/key pair %o %o', certPath, keyPath);
    return {certPath, keyPath};
  }

  /**
   * Gets a fully instantiated App instance.
   *
   * Lando will also scan parent directories if no app is found in `startFrom`
   *
   * @since 3.0.0
   * @alias lando.getApp
   * @param {String} [startFrom=process.cwd()] The directory to start looking for an app
   * @param {Boolean} [warn=true] Show a warning if we can't find an app
   * @return {App} Returns an instantiated App instandce.
   * @example
   * const app = lando.getApp('/path/to/my/app')
   */
  getApp(startFrom = process.cwd(), warn = true) {
    const getLandoFiles = require('../utils/get-lando-files');
    const lmerge = require('../utils/legacy-merge');
    const Yaml = require('./yaml');
    const yaml = new Yaml(this.log);
    // Grab lando files for this app
    const fileNames = _.flatten([this.config.preLandoFiles, [this.config.landoFile], this.config.postLandoFiles]);
    const landoFiles = getLandoFiles(fileNames, startFrom);
    // Return warning if we find nothing
    if (_.isEmpty(landoFiles)) {
      if (warn) {
        this.log.warn('could not find app in this dir or a reasonable amount of directories above it!');
      }
      return;
    }

    // Load the config and augment so we can get an App
    const config = lmerge({}, ..._.map(landoFiles, file => yaml.load(file)));
    this.log.info('loading app %s from config files', config.name, landoFiles);
    // Return us some app!
    const App = require('./app');
    return new App(config.name, _.merge({}, config, {files: landoFiles}), this);
  }

  async getInstallPluginsStatus(options = this.config.setup) {
    const getPluginConfig = require('../utils/get-plugin-config');
    const Plugin = require('../components/plugin');

    // reset Plugin static defaults for v3 purposes
    Plugin.config = getPluginConfig(this.config.pluginConfigFile, this.config.pluginConfig);
    Plugin.debug = require('../utils/debug-shim')(this.log);

    // attempt to compute the destination to install the plugin
    const {dir} = this.config.pluginDirs.find(dir => dir.type === require('../utils/get-plugin-type')());

    // event that lets plugins modify the status check
    await this.events.emit('pre-install-plugins', options);

    // prep tasks
    const plugins = require('../utils/parse-to-plugin-strings')(options.plugins);
    const results = await Promise.all(plugins.map(async plugin => {
      const {description, canInstall, isInstalled} = require('../utils/get-plugin-add-task')(plugin, {dir, Plugin});
      // lets also check for any internal instances of the plugin so we dont reinstall
      const parsed = require('../utils/parse-package-name')(plugin);
      const inCore = path.resolve(__dirname, '..', 'plugins', parsed.package);

      // lets start optimistically
      const status = {description, state: 'INSTALLED', version: plugin, id: parsed.name};

      // and slowly spiral down
      if (await isInstalled() === false && await isInstalled(inCore) === false) {
        try {
          await canInstall();
          status.state = 'NOT INSTALLED';
        } catch (error) {
          status.state = 'CANNOT INSTALL';
          status.comment = error.message;
        }
      }

      return status;
    }));

    // set plugins much with the results
    await this.events.emit('post-install-plugins', results);

    return results;
  }

  async installPlugins(options = this.config.setup) {
    const getPluginConfig = require('../utils/get-plugin-config');
    const Plugin = require('../components/plugin');

    // reset Plugin static defaults for v3 purposes
    Plugin.config = getPluginConfig(this.config.pluginConfigFile, this.config.pluginConfig);
    Plugin.debug = require('../utils/debug-shim')(this.log);

    // attempt to compute the destination to install the plugin
    const {dir} = this.config.pluginDirs.find(dir => dir.type === require('../utils/get-plugin-type')());

    // event that lets plugins modify the install
    await this.events.emit('pre-install-plugins', options);

    // prep tasks
    const tasks = require('../utils/parse-to-plugin-strings')(options.plugins)
      .map(plugin => require('../utils/get-plugin-add-task')(plugin, {dir, Plugin}))
      .map(task => require('../utils/parse-setup-task')({...task, count: false}));

    // try to fetch the plugins
    const {data, errors, results, total} = await this.runTasks(tasks, {
      renderer: 'dc2',
      rendererOptions: {
        header: 'Installing Plugins',
        states: {
          COMPLETED: 'Installed',
          STARTED: 'Installing',
          FAILED: 'FAILED',
          WAITING: 'Waiting',
        },
      },
    });

    // event that lets plugins modify the output
    await this.events.emit('post-install-plugins', {data, errors, results, total});

    this.log.debug('installed %s of %s plugins with %s errors', results.length, total, errors.length);

    // return
    return {data, errors, results, total};
  }

  // run tasks
  async runTasks(tasks, options = {}) {
    // some defaults
    const defaults = {rendererOptions: {log: this.log.debug}};

    // dc2 renderer has some special treatment
    if (options.renderer === 'dc2') {
      options = _.merge({}, {debug: 'dc2-debug', fallbackRenderer: 'simple'}, options);
    }

    // set to the debug renderer if we are in debug mode
    if (this.config.logLevelConsole > 3
      || this.config.logLevelConsole === 'debug'
      || this.config.logLevelConsole === 'silly') {
      options.renderer = options.debug || 'debug';
    }

    // @NOTE: this is mostly just to test to make sure the default renderer works in GHA
    if (process.env.LANDO_RENDERER_FORCE === '1') options.rendererForce = true;

    return await require('../utils/run-tasks')(tasks, _.merge(defaults, options));
  }

  // this lets us reload plugins mid-process as though we were bootstrapping lando freshly
  async reloadPlugins() {
    // if we dont do this we have at least double added setup tasks/plugins
    this.events.removeAllListeners();
    // reload plugins
    return await bootstrapConfig(this);
  }

  // setup
  async setup(options = this.config.setup) {
    // merge needed defaults into options
    options = _.merge({tasks: [], plugins: {}}, options);

    // collect our things
    const data = {errors: [], results: [], restart: false, total: 0};

    // if we should add plugins then install them
    if (options.installPlugins) {
      const {errors, results, total} = await this.installPlugins(options);
      data.errors = [...data.errors, ...errors];
      data.results = [...data.results, ...results];
      data.total = data.total + total;

      // refresh the plugin cache
      await this.reloadPlugins();
    }

    // pre setup event to mutate the setup tasks
    await this.events.emit('pre-setup', options);

    // if we should run setup tasks
    if (options.installTasks) {
      // wrap the tasks
      options.tasks = resolveSetupTasks(options.tasks.map(task => require('../utils/parse-setup-task')(task)));
      // and then run them
      const {errors, results, total} = await this.runTasks(options.tasks,
        {
          concurrent: true,
          exitOnError: false,
          renderer: 'dc2',
          rendererOptions: {
            header: 'Running Setup Tasks',
            states: {
              COMPLETED: 'Completed',
              STARTED: 'Running',
              FAILED: 'FAILED',
            },
          },
        },
      );

      data.errors = [...data.errors, ...errors];
      data.results = [...data.results, ...results];
      data.total = data.total + total;
      this.log.debug('ran %s of %s tasks with %s errors', results.length, results.length, errors.length);
    }

    // assess restart situation
    // @NOTE: we do not allow restarts on CI or non-interactive environments
    data.restart = this.config.isInteractive
      && !_.has(process, 'env.CI')
      && data.results.length > 0
      && options.tasks
        .filter(task => task.enabled)
        .some(task => task.requiresRestart === true);

    // post setup event
    await this.events.emit('post-setup', data);

    // return the results
    return data;
  }

  async getSetupStatus(options = this.config.setup) {
    // pre setup event to mutate the setup tasks
    await this.events.emit('pre-setup', options);

    const results = await Promise.all(options.tasks.map(async task => {
      // break it up
      const {id, canRun, comments, description, hasRun, requiresRestart, version} = require('../utils/parse-setup-task')(task); // eslint-disable-line max-len
      // lets start optimistically
      const status = {version, description, id, state: 'INSTALLED'};
      // and slowly spiral down
      // @TODO: woiuld be great if hasRun could also return a "comment" eg
      // "installed but slightly above desired range"
      if (await hasRun() === false) {
        try {
          await canRun();
          status.state = 'NOT INSTALLED';
          if (comments['NOT INSTALLED']) status.comment = comments['NOT INSTALLED'];
        } catch (error) {
          status.state = 'CANNOT INSTALL';
          status.comment = error.message;
        }
      }

      // if requires restart is a function then run it to reset teh task
      if (typeof requiresRestart === 'function') status.restart = await requiresRestart({}, task);
      else status.restart = requiresRestart;

      return status;
    }));

    // pre setup event to mutate the setup tasks
    await this.events.emit('post-setup', results);

    return results;
  }
};
