'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  if (_.has(app, 'config.recipe')) {
    // Throw a warning if recipe is not supported
    if (_.isEmpty(_.find(lando.factory.get(), {name: app.config.recipe}))) {
      app.log.warn('%s is not a supported recipe type.', app.config.recipe);
    }
    // Log da things
    app.log.verbose('building %s recipe named %s', app.config.recipe, app.project);
    // Build da things
    // @NOTE: this also gathers app.info and build steps
    const Recipe = lando.factory.get(app.config.recipe);
    const config = require('../utils/parse-recipe-config')(app.config.recipe, app);

    // Get recipe config
    const recipe = new Recipe(config.name, config).config;

    // Cache dump our app tooling so we can use it in our entrypoint
    // @NOTE: we dump pre-merge so that tooling directly in the landofile is not mixed in
    lando.cache.set(app.recipeCache, recipe, {persist: true});

    // Merge stuff together correctly
    app.config.proxy = _.merge({}, recipe.proxy, _.get(app, 'config.proxy', {}));
    app.config = lando.utils.merge({services: recipe.services, tooling: recipe.tooling}, app.config);
  }
};
