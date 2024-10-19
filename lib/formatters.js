'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const util = require('util');

// Const
const formats = ['default', 'json', 'table'];
const formatOpts = {
  format: {
    describe: `Outputs in given format: ${formats.join(', ')}`,
    choices: formats,
    string: true,
  },
  path: {
    describe: 'Returns the value at the given path',
    default: null,
    string: true,
  },
  filter: {
    describe: 'Filters data by "key=value"',
    array: true,
  },
};

/*
 * Format data
 */
exports.formatData = (data, {path = '', format = 'default', filter = []} = {}, opts = {}) => {
  // Attempt to filter if we can
  if (_.isArray(data) && !_.isEmpty(filter)) {
    const filters = _(filter).map(f => f.split('=')).fromPairs().value();
    data = _.filter(data, filters);
  }
  // Attempt to get a path if we can
  if (_.isObject(data) && !_.isEmpty(path)) {
    data = _.get(data, path, data);
  }
  switch (format) {
    case 'json':
      return JSON.stringify(data);
    case 'otable': {
      const ux = require('@oclif/core').ux;
      // rows
      const rows = require('../utils/get-object-keys')(data, {expandArrays: false}).map(key => ({key, value: _.get(data, key)}));
      // columes
      const columns = {key: {}, value: {get: row => require('../utils/prettify')(row.value)}};

      // in order to keep this API consistent with return we need to hack console.log
      // so we can get the table output in a string
      let output = '';
      const ogcl = console.log;
      console.log = data => output += `${data}\n`;

      // print table
      ux.ux.table(_.sortBy(rows, 'key'), columns);
      // restore
      console.log = ogcl;
      // return
      return output;
    }
    case 'table': {
      const Table = require('./table');
      if (!_.isArray(data)) {
        const table = new Table(data, opts);
        return table.toString();
      }
      return _(data)
        .map(value => new Table(value, opts))
        .map(table => table.toString())
        .thru(data => data.join(os.EOL))
        .value();
    }
    default:
      return util.inspect(data, {
        colors: process.stdout.isTTY,
        depth: 10,
        compact: true,
        sorted: _.get(opts, 'sort', false),
      });
  }
};

/*
 * FormatOptios
 */
exports.formatOptions = (omit = []) => _.omit(formatOpts, omit);

/*
 * Helper to get interactive options
 */
exports.getInteractive = (options, argv) => _(options)
  .map((option, name) => _.merge({}, {name}, {option}))
  .filter(option => !_.isEmpty(_.get(option, 'option.interactive', {})))
  .map(option => _.merge({}, {name: option.name, weight: 0}, option.option.interactive))
  .map(option => {
    if (_.isNil(argv[option.name]) || argv[option.name] === false) return option;
    else {
      return _.merge({}, option, {when: answers => {
        answers[option.name] = argv[option.name];
        return false;
      }});
    }
  })
  .value();

/*
 * Helper to prompt the user if needed
 */
exports.handleInteractive = (inquiry, argv, command, lando, file) => lando.Promise.try(() => {
  if (_.isEmpty(inquiry)) return {};
  else {
    const inquirer = require('inquirer');
    inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

    // mix in the full task object so we can load in functions and that sort of thing
    if (file && fs.existsSync(file)) {
      // find index of task
      const tid = lando.tasks.findIndex(task => task.command === command);
      // replace
      lando.tasks[tid] = require(file)(lando, lando.appConfig);
    }

    // Try to rebuild the inquiry if this is app level bootstrap and we have an app
    if (!_.isEmpty(argv._app) && lando._bootstrap === 'engine') {
      // get id
      const getId = command => {
        if (typeof command === 'string') return command.split(' ')[0];
        return command;
      };
      const tooling = _(_.get(argv, '_app.tooling', {}))
        .map((tooling, command) => _.merge({}, tooling, {command}))
        .concat(lando.tasks)
        .map(command => _.merge({}, command, {id: command.id || getId(command.command)}))
        .value();

      const task = _.find(tooling, {command}) || _.find(tooling, {id: command});

      inquiry = exports.getInteractive(task.options, argv);
      return inquirer.prompt(_.sortBy(inquiry, 'weight'));
    }

    // Try to rebuild the inquiry if this is app level bootstrap and we have an app
    if (!_.isEmpty(argv._app) && lando._bootstrap === 'app') {
      // NOTE: We need to clone deep here otherwise any apps with interactive options get 2x all their events
      // NOTE: Not exactly clear on why app here gets conflated with the app returned from lando.getApp
      const app = _.cloneDeep(lando.getApp(argv._app.root));
      return app.init({noEngine: true}).then(() => {
        inquiry = exports.getInteractive(_.find(app.tasks.concat(lando.tasks), {command: command}).options, argv);
        return inquirer.prompt(_.sortBy(inquiry, 'weight'));
      });

    // Otherwise just run
    } else {
      inquiry = exports.getInteractive(_.find(lando.tasks, {command: command}).options, argv);
      return inquirer.prompt(_.sortBy(inquiry, 'weight'));
    }
  }
});

/*
 * Helper to sort options
 */
exports.sortOptions = options => _(options)
  .keys()
  .sortBy()
  .map(key => [key, options[key]])
  .fromPairs()
  .value();
