'use strict';

const _ = require('lodash');
const slugify = require('./slugify.js');

// Name Opts
const nameOpts = {
  describe: 'The name of the app',
  string: true,
  interactive: {
    type: 'input',
    message: () => 'What do you want to call this app?',
    default: () => 'My Lando App',
    filter: input => slugify(input),
    when: () => true,
    weight: 1000,
    validate: () => true,
  },
};

// Recipe Opts
const recipeOpts = recipes => ({
  describe: 'The recipe with which to initialize the app',
  choices: recipes,
  alias: ['r'],
  string: true,
  interactive: {
    type: 'list',
    message: () => 'What recipe do you want to use?',
    default: () => 'lamp',
    choices: _.map(recipes, recipe => ({name: recipe, value: recipe})),
    filter: input => input,
    when: () => true,
    weight: 500,
    validate: () => true,
  },
});

// Webroot Opts
const webrootOpts = {
  describe: 'Specify the webroot relative to app root',
  string: true,
  interactive: {
    type: 'input',
    message: () => 'Where is your webroot relative to the init destination?',
    default: () => '.',
    filter: input => input,
    when: () => true,
    weight: 900,
    validate: () => true,
  },
};

module.exports = recipes => ({name: nameOpts, recipe: recipeOpts(_.orderBy(recipes)), webroot: webrootOpts});
