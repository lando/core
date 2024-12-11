'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

// Helper for init display
const showInit = (lando, options) => {
  console.log(lando.cli.makeArt('init'));
  // Print the table
  console.log(lando.cli.formatData({
    name: options.name,
    location: options.destination,
    recipe: options.recipe,
    docs: `https://docs.lando.dev/config/${options.recipe}.html`,
  }, {format: 'table'}, {border: false}));
  // Space it
  console.log('');
};

// Helper for basic YAML
const getYaml = (dest, options, lando) => {
  // Get existing lando if we have it
  const existingLando = (fs.existsSync(dest)) ? lando.yaml.load(dest) : {};
  // Set the basics
  const landoConfig = {name: options.name, recipe: options.recipe};
  // Set the webroot if we have one
  if (!_.isEmpty(options.webroot)) _.set(landoConfig, 'config.webroot', options.webroot);
  // Return merged YAML
  return _.merge(existingLando, landoConfig);
};

// Helper to run our build tasks
const runBuild = (lando, options = {}, steps = []) => lando.Promise.each(steps, step => {
  if (_.has(step, 'func')) {
    return step.func(options, lando);
  } else {
    step.cmd = (_.isFunction(step.cmd)) ? step.cmd(options) : step.cmd;
    return require('../utils/run-init')(
      lando,
      require('../utils/build-init-runner')(_.merge(
        {},
        require('../utils/get-init-runner-defaults')(lando, options),
        step,
      )),
    );
  }
});

module.exports = lando => {
  // helpers
  const getInitOptions = require('../utils/get-init-options');
  const getInitBaseOpts = require('../utils/get-init-base-opts');
  const getInitOveridesOpts = require('../utils/get-init-override-opts');
  const parseInitOptions = require('../utils/parse-init-options');

  // Stuffz we need
  const inits = lando.config.inits;
  const sources = lando.config.sources;
  const recipes = lando.config.recipes;
  const configOpts = getInitOptions(inits.concat(sources), lando);

  const getConfig = (data = [], name) => _.find(data, {name});

  return {
    command: 'init',
    level: 'app',
    describe: 'Fetched code and/or initializes a Landofile for use with lando',
    usage: `$0 init
    [--name <name>]
    [--recipe <recipe>]
    [--source <source>]
    [--full]
    [--github-auth==<token>]
    [--github-repo==<url>]
    [--option=<path=value>...]
    [--remote-options=<options>]
    [--remote-url=<url>]
    [--webroot=<path>]
    [--yes]
    [--other-plugin-provided-options...]`,
    options: _.merge(getInitBaseOpts(recipes, sources), configOpts, getInitOveridesOpts(inits, recipes, sources)),
    run: async options => {
      // Parse options abd and configs
      options = parseInitOptions(options);
      // Get our recipe and source configs
      const recipeConfig = getConfig(inits, options.recipe);
      const sourceConfig = getConfig(sources, options.source);
      // Get our build and config steps
      const buildSteps = (_.has(sourceConfig, 'build')) ? sourceConfig.build(options, lando) : [];
      const configStep = (_.has(recipeConfig, 'build')) ? recipeConfig.build : () => {};

      // run setup if we need to
      await require('../hooks/lando-run-setup')(lando);

      // Pre init event and run build steps
      // @NOTE: source build steps are designed to grab code from somewhere
      await lando.events.emit('pre-init', options, buildSteps);

      // run build
      await runBuild(lando, options, buildSteps);

      // Run any config steps
      // @NOTE: config steps are designed to augmnet the landofile with additional metadata
      const config = await configStep(options, lando);

      // Compile and dump the yaml
      // if config is false then it means we want to skip landofile mutation
      if (config !== false) {
        // Where are we going?
        const dest = path.join(options.destination, '.lando.yml');
        const landoFile = getYaml(dest, options, lando);

        // Get a lower level config if needed, merge in current recipe config
        if (options.full) {
          const Recipe = lando.factory.get(options.recipe);
          const config = _.merge({}, landoFile, {app: landoFile.name, _app: {_config: lando.config}});
          _.merge(landoFile, new Recipe(landoFile.name, config).config);
        }

        // Merge in recipe defaults
        landoFile.config = _.merge(recipeConfig.defaults ?? {}, landoFile.config);

        // Merge in any additional configuration options specified
        _.forEach(options.option, option => {
          const key = _.first(option.split('='));
          _.set(landoFile, `config.${key}`, _.last(option.split('=')));
        });

        // Merge and dump the config file
        lando.yaml.dump(dest, _.merge(landoFile, config));
      }

      // Show it
      showInit(lando, options);

      // Post init event
      await lando.events.emit('post-init', options);
    },
  };
};
