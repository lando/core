'use strict';

const _ = require('lodash');

// Helper to get default options
const defaultOpts = {
  destination: {
    hidden: true,
    alias: ['dest', 'd'],
    string: true,
  },
  full: {
    describe: 'Dump a lower level lando file',
    default: false,
    boolean: true,
  },
  option: {
    alias: ['o'],
    describe: 'Merge additional KEY=VALUE pairs into your recipes config',
    array: true,
  },
  yes: {
    describe: 'Auto answer yes to prompts',
    alias: ['y'],
    default: false,
    boolean: true,
  },
};

// Helper to get core options
const coreOpts = sources => ({
  source: {
    describe: 'The location of your apps code',
    choices: _.map(sources, 'name'),
    alias: ['src'],
    string: true,
    interactive: {
      type: 'list',
      message: 'From where should we get your app\'s codebase?',
      default: 'cwd',
      choices: _.map(sources, source => ({name: source.label, value: source.name})),
      weight: 100,
    },
  },
});

module.exports = (recipes = [], sources = []) => _.merge(
  defaultOpts,
  coreOpts(sources),
  require('./get-init-aux-opts')(recipes),
);
