'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EOL = os.EOL;

const formatters = require('./formatters');
const getSysDataPath = require('../utils/get-system-data-dir');

/**
 * @typedef {import('chalk').Chalk} Chalk
 * @typedef {import('inquirer')} Inquirer
 * @typedef {import('yargs')} YargsInstance
 * @typedef {import('yargs').Arguments} Arguments
 * @typedef {import('yargs').CommandModule} CommandModule
 * @typedef {import('yargs').Options} Options
 * @typedef {import('yargs').ParserConfigurationOptions} ParserConfigurationOptions
 * @typedef {import('yargs').BuilderCallback} BuilderCallback
 */

/**
 * @typedef {Object} GlobalOptions
 * @property {Object} channel - Channel option configuration
 * @property {string} channel.describe - Option description
 * @property {string[]} channel.choices - Valid channel choices
 * @property {boolean} channel.global - Whether option is global
 * @property {string} channel.type - Option type
 * @property {Object} clear - Clear option configuration
 * @property {string} clear.describe - Option description
 * @property {boolean} clear.global - Whether option is global
 * @property {string} clear.type - Option type
 * @property {Object} debug - Debug option configuration
 * @property {string} debug.describe - Option description
 * @property {boolean} debug.global - Whether option is global
 * @property {string} debug.type - Option type
 * @property {Object} experimental - Experimental option configuration
 * @property {string} experimental.describe - Option description
 * @property {boolean} experimental.global - Whether option is global
 * @property {boolean} experimental.hidden - Whether option is hidden
 * @property {string} experimental.type - Option type
 * @property {Object} help - Help option configuration
 * @property {string} help.describe - Option description
 * @property {string} help.type - Option type
 * @property {Object} lando - Lando option configuration
 * @property {boolean} lando.hidden - Whether option is hidden
 * @property {string} lando.type - Option type
 * @property {Object} verbose - Verbose option configuration
 * @property {string} verbose.alias - Option alias
 * @property {string} verbose.describe - Option description
 * @property {string} verbose.type - Option type
 */

/**
 * @typedef {Object} TaskConfig
 * @property {string} [command] - Command name
 * @property {string} [describe] - Command description
 * @property {Array<string|Array>} [examples] - Command examples
 * @property {string} [file] - Path to task file
 * @property {Options} [options] - Command options
 * @property {Object} [positionals] - Command positional arguments
 * @property {Function|Object} [run] - Command run function
 * @property {string} [level='app'] - Command level
 * @property {string} [usage] - Command usage
 */

/**
 * @typedef {Object} CliConfig
 * @property {string} [prefix='LANDO'] - Environment variable prefix
 * @property {string} [logLevel='warn'] - Default log level
 * @property {string} [userConfRoot='~/.lando'] - Path to user config directory
 * @property {string} [coreBase='../'] - Path to Lando core base directory
 * @property {Function} [debug=require('debug')('@lando/cli')] - Debug function
 */

/**
 * @typedef {Object} ErrorHandler
 * @property {(error: Error & {verbose?: number}, reportErrors?: boolean) => Promise<number>} handle - Handles an error and returns exit code
 */

/**
 * @typedef {Error & {verbose?: number}} LandoError
 */

// Global options
const globalOptions = {
  channel: {
    describe: 'Sets the update channel',
    choices: ['edge', 'none', 'stable'],
    global: true,
    type: 'array',
  },
  clear: {
    describe: 'Clears the lando tasks cache',
    global: true,
    type: 'boolean',
  },
  debug: {
    describe: 'Shows debug output',
    global: true,
    type: 'boolean',
  },
  experimental: {
    describe: 'Activates experimental features',
    global: true,
    hidden: true,
    type: 'boolean',
  },
  help: {
    describe: 'Shows lando or delegated command help if applicable',
    type: 'boolean',
  },
  lando: {
    hidden: true,
    type: 'boolean',
  },
  verbose: {
    alias: 'v',
    describe: 'Runs with extra verbosity',
    type: 'count',
  },
};

/**
 * The CLI class provides command line interface functionality for Lando
 *
 * This class handles command line argument parsing, task management, and user interaction
 * for the Lando CLI. It integrates with the core Lando system to provide a complete
 * command line interface.
 *
 * @since 3.0.0
 * @class
 * @memberof module:Lando
 * @property {string} prefix - Environment variable prefix for CLI
 * @property {string} logLevel - Default log level
 * @property {string} userConfRoot - Path to user config directory
 * @property {string} coreBase - Path to Lando core base directory
 * @property {Function} debug - Debug logging function
 * @property {Chalk} chalk - Chalk instance for terminal coloring
 * @property {Arguments} argv Parsed CLI arguments
 * @property {Function} checkPerms Checks if Lando is running with sudo
 * @property {Function} clearTaskCaches Clears the Lando task caches
 * @property {Function} confirm Creates a confirmation prompt configuration
 * @property {Function} defaultConfig Returns default configuration for CLI bootstrap
 * @property {Function} formatData Formats data for CLI output
 * @property {Function} formatOptions Gets CLI options formatting
 */
class Cli {
  /**
   * Creates a new CLI instance
   * @param {CliConfig} config - CLI configuration options
   */
  constructor({
    prefix = 'LANDO',
    logLevel = 'warn',
    userConfRoot = path.join(os.homedir(), '.lando'),
    coreBase = path.resolve(__dirname, '..'),
    debug = require('debug')('@lando/cli'),
  } = {}) {
    this.prefix = prefix;
    this.logLevel = logLevel;
    this.userConfRoot = userConfRoot;
    this.coreBase = coreBase;
    this.debug = debug;
    this.chalk = require('chalk');
  }

  /**
   * Returns a parsed array of CLI arguments and options
   *
   * @since 3.0.0
   * @alias lando.cli.argv
   * @return {Arguments} Yargs parsed command line arguments
   * @example
   * const argv = lando.cli.argv();
   * @todo make this static and then fix all call sites
   */
  argv() {
    return require('yargs').help(false).version(false).argv;
  }

  /**
   * Checks if Lando is running with sudo and exits if true
   *
   * @since 3.0.0
   * @alias lando.cli.checkPerms
   * @example
   * lando.cli.checkPerms()
   * @throws {Error} If Lando is running with sudo
   */
  checkPerms() {
    const sudoBlock = require('sudo-block');
    sudoBlock(this.makeArt('sudoRun'));
  }

  /**
   * Clears the Lando task caches
   * @private
   */
  clearTaskCaches() {
    const taskCacheFile = process.env.LANDO_TASK_CACHE_FILE;
    const appCacheFile = process.env.LANDO_APP_CACHE_FILE;
    if (taskCacheFile && fs.existsSync(taskCacheFile)) fs.unlinkSync(taskCacheFile);
    if (appCacheFile && fs.existsSync(appCacheFile)) fs.unlinkSync(appCacheFile);
  }

  /**
   * Creates a confirmation prompt configuration
   *
   * @param {string} [message='Are you sure?'] Prompt message
   * @return {Object} Inquirer prompt configuration
   */
  confirm(message = 'Are you sure?') {
    return {
      describe: 'Answers yes to prompts',
      alias: ['y'],
      default: false,
      boolean: true,
      interactive: {
        type: 'confirm',
        default: false,
        message: message,
      },
    };
  }

  /**
   * Returns default configuration for CLI bootstrap
   *
   * @since 3.5.0
   * @alias lando.cli.defaultConfig
   * @param {Object} [appConfig={}] Optional raw landofile
   * @return {Object} CLI bootstrap configuration
   * @example
   * const config = lando.cli.defaultConfig();
   * // Kick off our bootstrap
   * bootstrap(config).then(lando => console.log(lando));
   */
  defaultConfig(appConfig = {}) {
    // determin some things about the cli
    // absolute path to cli base
    const srcRoot = path.resolve(__dirname, '..');
    const pjson = require(path.join(srcRoot, 'package.json'));

    // whether the cli is "packaged" eg a self-contained binary or not
    const packaged = _.has(process, 'pkg');
    // cli is packaged and also is a "dev" release
    const dev = packaged && require('../utils/is-dev-version')(pjson.version);

    // when packaged this resolves symlinks and gives you the actual absolute path of the binary
    // when run from source it gives you the path to js entrypoint
    const file = packaged ? process.execPath : _.get(process, 'mainModule.filename', process.argv[1]);
    const entrypoint = packaged ? _.get(process, 'env._') ?? file : process.argv[1] ?? _.get(process, 'env._');

    // this is just the default place to install the lando binaries
    // @NOTE: in lando 4 we need some kind of "system wide/root" location for this eg /usr/local/bin?
    const installPath = path.join(this.userConfRoot, 'bin');

    // if the cli is running from source (eg a git repo) or not
    const args = process.execArgv;
    const source = fs.existsSync(path.join(srcRoot, '.git', 'HEAD'));
    const commit = source ? require('../utils/get-commit-hash')(srcRoot, {short: true}) : false;
    const coreBase = this.coreBase === path.resolve(__dirname, '..');
    const slim = !fs.existsSync(path.resolve(__dirname, '..', 'FATCORE'));

    // put it all together
    const cli = {args, commit, coreBase, dev, entrypoint, file, installPath, packaged, plugin: srcRoot, slim, source};
    this.debug('using cli config %o', cli);

    const config = {
      alliance: fs.existsSync(path.join(this.userConfRoot, 'secret-toggle')),
      channel: 'stable',
      cli,
      configSources: [path.join(srcRoot, 'config.yml'), path.join(this.userConfRoot, 'config.yml')],
      command: this.argv(),
      domain: 'lndo.site',
      disablePlugins: ['lando-core', '@lando/core-next'],
      experimental: false,
      envPrefix: this.prefix,
      fatcore: !slim,
      isInteractive: require('is-interactive')(),
      landoFile: '.lando.yml',
      landoFileConfig: appConfig,
      leia: _.has(process, 'env.LEIA_PARSER_RUNNING'),
      logLevelConsole: (this.argv().verbose) ? this.argv().verbose + 1 : this.logLevel,
      logDir: path.join(this.userConfRoot, 'logs'),
      mode: 'cli',
      packaged,
      pluginConfig: {},
      pluginConfigFile: path.join(this.userConfRoot, 'plugin-auth.json'),
      pluginDirs: [
        // src locations
        {path: path.join(srcRoot, 'node_modules', '@lando'), subdir: '.', namespace: '@lando'},
        // system locations
        {path: path.join(getSysDataPath('lando'), 'plugins'), subdir: '.', type: 'system'},
        {path: path.join(getSysDataPath('lando'), 'plugins', '@lando'), subdir: '.', namespace: '@lando', type: 'system-lando'},
        // user locations
        {path: path.join(this.userConfRoot, 'global-plugins', '@lando'), subdir: '.', namespace: '@lando'},
        {path: this.userConfRoot, subdir: 'plugins', type: 'user'},
        {path: path.join(this.userConfRoot, 'plugins', '@lando'), subdir: '.', namespace: '@lando', type: 'user-lando'},
      ],
      preLandoFiles: ['.lando.base.yml', '.lando.dist.yml', '.lando.recipe.yml', '.lando.upstream.yml'],
      postLandoFiles: ['.lando.local.yml', '.lando.user.yml'],
      product: 'lando',
      runtime: 3,
      userConfRoot: this.userConfRoot,
    };

    // version calculations are actually kind of complex
    // lets start with the cli since that is easiest
    config.cli.version = pjson.version;
    // if the cli is running from source lets modify with the commit
    if (!cli.packaged && !cli.dev && cli.source && cli.commit) config.cli.version = `${config.cli.version}-0-${cli.commit}`;
    // as of 3.23.0 these are now the same so this is way easier
    config.version = config.cli.version;
    // useragent
    config.userAgent = `Lando/${config.version}`;
    // return
    return config;
  }

  /**
   * Formats data for CLI output
   *
   * @param {*} data Data to format
   * @param {Object} [options] Format options
   * @param {string} [options.path=''] Path to data property
   * @param {string} [options.format='default'] Output format
   * @param {Array} [options.filter=[]] Properties to filter
   * @param {Object} [opts={}] Additional formatting options
   * @return {string} Formatted output
   */
  formatData(data, {path = '', format = 'default', filter = []} = {}, opts = {}) {
    return formatters.formatData(data, {path, format, filter}, opts);
  }

  /**
   * Gets CLI options formatting
   *
   * @param {Array} [omit=[]] Options to omit
   * @return {Object} Formatted options
   */
  formatOptions(omit = []) {
    return formatters.formatOptions(omit);
  }

  /**
   * Gets Inquirer instance for prompts
   *
   * @return {Inquirer} Inquirer instance
   */
  getInquirer() {
    return require('inquirer');
  }

  /**
   * Gets oclif UX instance
   *
   * @return {Object} oclif UX instance
   */
  getUX() {
    return require('@oclif/core').ux;
  }

  /**
   * Checks if debug mode is enabled
   *
   * @return {number} Debug level
   */
  isDebug() {
    const {debug, verbose} = this.argv();
    return debug ? 1 + verbose : 0 + verbose;
  }

  /**
   * Handles CLI errors
   *
   * @since 3.0.0
   * @alias lando.cli.handleError
   * @param {LandoError} error Error object
   * @param {ErrorHandler} handler Error handler
   * @param {number} [verbose=this.argv().verbose] Verbosity level
   * @param {Object} [lando={}] Lando instance
   * @param {boolean} [yes=this.argv().yes] Auto-confirm prompts
   * @return {Promise<number>} Exit code
   */
  handleError(error, handler, verbose = this.argv().verbose, lando = {}, yes = this.argv().yes) {
    // Set the verbosity
    error.verbose = verbose;

    // clear tasks caches on all errors
    this.clearTaskCaches();

    // if report_errors is not set but -y was passed in then set it here to avoid the prompt below
    if (_.isNil(lando.cache.get('report_errors')) && yes) {
      lando.cache.set('report_errors', yes, {persist: true});
    }

    // Ask question if we haven't sent error reporting yet and the terminal is capable of answering
    return lando.Promise.try(() => {
      if (_.isNil(lando.cache.get('report_errors')) && require('is-interactive')()) {
        const inquirer = require('inquirer');
        console.error(this.makeArt('crash'));
        const test = {
          name: 'reportErrors',
          type: 'confirm',
          default: true,
          message: 'Send crash reports?',
        };
        return inquirer.prompt([test]).then(answers => {
          lando.cache.set('report_errors', answers.reportErrors, {persist: true});
        });
      }
    })
    // Report error if user has error reporting on
    .then(() => handler.handle(error, lando.cache.get('report_errors')).then(code => process.exit(code)));
  }

  /**
   * Initializes the CLI with tasks and configuration
   *
   * @param {YargsInstance} yargs Yargs instance
   * @param {Array<CommandModule>} tasks CLI tasks
   * @param {Object} config Lando configuration
   * @param {Object} [userConfig={}] User configuration
   */
  init(yargs, tasks, config, userConfig = {}) {
    // if we have LANDO_ENTRYPOINT_NAME
    const $0 = process?.env?.LANDO_ENTRYPOINT_NAME ?? '$0';

    // basic usage
    const usage = [`${this.chalk.green('Usage:')}${EOL}  ${$0} <command> [args] [options]`];
    // add experimental mode info
    if (userConfig.experimental) usage.push(`${this.makeArt('print', {text: '(experimental mode)', color: 'magenta'})}`);

    // Yargs!
    yargs.usage(usage.join(' '))
      .demandCommand(1, 'You need at least one command before moving on')
      .example(`${$0} start`, 'Runs lando start')
      .example(`${$0} rebuild --help`, 'Gets help about using the lando rebuild command')
      .example(`${$0} destroy -y --debug`, 'Runs lando destroy non-interactively and with maximum verbosity')
      .example(`${$0} --clear`, 'Clears the lando tasks cache')
      .parserConfiguration({'populate--': true})
      .recommendCommands()
      .wrap(yargs.terminalWidth() * 0.70)
      .option('channel', globalOptions.channel)
      .option('clear', globalOptions.clear)
      .option('debug', globalOptions.debug)
      .option('experimental', globalOptions.experimental)
      .help(false)
      .option('lando', globalOptions.lando)
      .option('help', globalOptions.help)
      .option('verbose', globalOptions.verbose)
      .version(false)
      .middleware([(argv => {
        argv._app = config;
        argv._yargs = yargs;
      })]);

    // manually set scriptname if needed
    if ($0 !== '$0') yargs.scriptName($0);

    // Modify the script name in certain circumstances eg its packaged and being invoked from a symlink
    // @NOTE: should we check for argv0 being a symlink?
    if (_.has(process, 'pkg') && path.join(process.cwd(), process.argv0) !== process.execPath) {
      yargs.scriptName(path.basename(process.argv0));
    }

    // Loop through the tasks and add them to the CLI
    _.forEach(_.sortBy(tasks, 'command'), task => {
      if (_.has(task, 'handler')) yargs.command(task);
      else yargs.command(this.parseToYargs(task, config));
    });

    // Show help unless this is a delegation command
    const current = _.find(tasks, {command: yargs.argv._[0]});
    if ((yargs.argv.help || yargs.argv.lando) && _.get(current, 'delegate', false) === false) {
      yargs.showHelp('log');
      process.exit(0);
    }

    // YARGZ MATEY
    yargs.argv;
  }

  /**
   * Generates CLI art
   *
   * @since 3.0.0
   * @alias lando.cli.makeArt
   * @param {string} func Art function to call
   * @param {Object} [opts] Function options
   * @return {string} Generated art
   * @example
   * console.log(lando.cli.makeArt('secretToggle', true);
   */
  makeArt(func, opts) {
    return require('./art')[func](opts);
  }

  /**
   * Parses a Lando task into Yargs command format
   *
   * A lando task object is an abstraction on top of yargs that also contains some
   * metadata about how to interactively ask questions on both a CLI and GUI.
   *
   * @since 3.5.0
   * @alias lando.cli.parseToYargs
   * @param {TaskConfig} task - Lando task configuration
   * @param {Object} [config={}] - Lando configuration
   * @return {CommandModule} Yargs command object
   * @see {@link http://yargs.js.org/docs/|Yargs}
   * @see {@link https://github.com/sboudrias/Inquirer.js|Inquirer.js}
   * @example
   * // Add a task to the yargs CLI
   * yargs.command(lando.tasks.parseToYargs(task));
   */
  parseToYargs({
    command,
    describe,
    examples = [],
    file = undefined,
    options = {},
    positionals = {},
    run = {},
    level = 'app',
    usage = undefined,
  } = {}, config = {}) {
    const handler = argv => {
      // Immediately build some arg data set opts and interactive options
      const data = {options: argv, inquiry: formatters.getInteractive(options, argv)};
      // Remove legacy secret toggle if still there
      const secretToggleFile = path.join(this.defaultConfig().userConfRoot, 'secret-toggle');
      if (fs.existsSync(secretToggleFile)) fs.unlinkSync(secretToggleFile);

      // Summon lando
      const Lando = require(this.coreBase);
      const lando = new Lando(this.defaultConfig(config));

      // Add this to lando
      lando.cli = this;
      lando.appConfig = config;

      // Handle uncaught things
      _.forEach(['unhandledRejection', 'uncaughtException'], exception => {
        process.on(exception, error => this.handleError(error, lando.error, this.isDebug(), lando));
      });

      // run the bootstrap
      return lando.bootstrap(level)
        /**
         * Event that allows altering of argv or inquirer before interactive prompts
         * are run
         *
         * You will want to replace CMD with the actual task name eg `task-start-answers`.
         *
         * @since 3.0.0
         * @event task_CMD_answers
         * @property {Object} answers argv and inquirer questions
         */
        .then(() => lando.events.emit('cli-answers', data, argv._[0]))
        .then(() => lando.events.emit(`cli-${argv._[0]}-answers`, data, argv._[0]))

        // Attempt to filter out questions that have already been answered
        // Prompt the use for feedback if needed and sort by weight
        .then(() => formatters.handleInteractive(data.inquiry, data.options, command, lando, file))

        /**
         * Event that allows final altering of answers before the task runs
         *
         * You will want to replace CMD with the actual task name eg `task-start-run`.
         *
         * @since 3.0.0
         * @event task_CMD_run
         * @property {Object} answers object
         */
        .then(answers => lando.events.emit('cli-run', _.merge(data.options, answers), argv._[0]))
        .then(() => lando.events.emit(`cli-${argv._[0]}-run`, data, argv._[0]))

        // Find and run the task, unless we already have one
        // @TODO: somehow handle when commands break eg change task name, malformed tasks
        .then(() => {
          // if run is already a function
          if (_.isFunction(run)) return run(data.options, lando, config);
          // if we have a task then do that
          else if (file && fs.existsSync(file)) return require(file)(lando, config).run(data.options);
          // error?
          throw new Error(`Could not locate a runner for ${command}!`);
        })

        // Add a final event for other stuff
        .then(() => lando.events.emit('before-end'))

        // Handle all other errors eg likely things that happen pre bootstrap
        .catch(error => this.handleError(error, lando.error, this.isDebug(), lando))
        // If we caught an error that resulted in an error code lets make sure we exit non0
        .finally(() => process.exit(_.get(lando, 'exitCode', 0)));
    };

    // Return our yarg command
    return {command, describe, handler, builder: yargs => {
      // ensure options is an object if it isnt
      if (!_.isPlainObject(options)) options = {};

      // if we have options then let is sort and add them
      if (Object.keys(options).length > 0) {
        for (const [option, config] of Object.entries(formatters.sortOptions(options))) {
          yargs.option(option, config);
        }
      }

      // ditto for positionals
      if (Object.keys(positionals).length > 0) {
        for (const [arg, config] of Object.entries(formatters.sortOptions(positionals))) {
          yargs.positional(arg, config);
        }
      }

      // examples are also good!
      for (const example of examples) {
        if (typeof example === 'string') yargs.example(example);
        else yargs.example(...example);
      }

      // and also allow usage
      if (usage) {
        const prefix = [`$0 ${command}`];
        // add description if available
        if (describe) prefix.push(describe);
        // and put it 2getha
        yargs.usage([...prefix, `${this.chalk.green('Usage:')}${EOL}  ${usage}`].join(`${EOL}${EOL}`));
      }
    }};
  }

  /**
   * Prettifies data for CLI output
   *
   * @param {*} data Data to prettify
   * @param {Object} [options] Prettify options
   * @param {string} [options.arraySeparator=', '] Separator for arrays
   * @return {string} Prettified output
   */
  prettify(data, {arraySeparator = ', '} = {}) {
    return require('../utils/prettify')(data, {arraySeparator});
  }

  /**
   * Runs the CLI
   *
   * @param {Array<CommandModule>} [tasks=[]] CLI tasks
   * @param {Object} [config={}] Lando configuration
   */
  run(tasks = [], config = {}) {
    const yargonaut = require('yargonaut');
    yargonaut.style('green').errorsStyle('red');
    const yargs = require('yargs');
    const {clear, channel, experimental, secretToggle} = yargs.argv;

    // Handle global flag error conditions first
    if (secretToggle && this.defaultConfig().packaged) {
      console.error(this.makeArt('secretToggleDenied'));
      process.exit(1);
    }
    if (channel && !_.includes(globalOptions.channel.choices, channel)) {
      console.error(this.makeArt('print', {text: `Unknown release channel: ${channel}`, color: 'red'}));
      process.exit(1);
    }

    // Handle all our configuration global opts first
    const userConfig = this.updateUserConfig();
    if (clear) console.log('Lando has cleared the tasks cache!');
    if (channel) {
      this.updateUserConfig({channel: channel});
      const updateFile = path.join(this.defaultConfig().userConfRoot, 'cache', 'updates');
      if (fs.existsSync(updateFile)) fs.unlinkSync(updateFile);
      console.log(this.makeArt('releaseChannel', channel));
    }
    if (experimental) {
      this.updateUserConfig({experimental: !userConfig.experimental});
      console.log(this.makeArt('experimental', !userConfig.experimental));
    }
    if (secretToggle) {
      this.updateUserConfig({alliance: !userConfig.alliance});
      console.log(this.makeArt('secretToggle', !userConfig.alliance));
    }
    if (clear || channel || experimental || secretToggle) {
      this.clearTaskCaches();
      process.exit(0);
    }

    // Initialize
    this.init(yargs, tasks, config, userConfig);
  }

  /**
   * Updates user configuration
   *
   * @param {Object} [data={}] Configuration updates
   * @return {Object} Updated configuration
   */
  updateUserConfig(data = {}) {
    const Yaml = require(`../lib/yaml`);
    const yaml = new Yaml();
    const configFile = path.join(this.defaultConfig().userConfRoot, 'config.yml');
    const config = (fs.existsSync(configFile)) ? yaml.load(configFile) : {};
    const file = yaml.dump(configFile, _.assign({}, config, data));
    return yaml.load(file);
  }
}

module.exports = Cli;
