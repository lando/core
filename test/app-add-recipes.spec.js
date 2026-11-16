/*
 * Tests for hooks/app-add-recipes.
 * @file app-add-recipes.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const fs = require('fs');
const os = require('os');
const path = require('path');

// Get the hook and the real base recipe class to extend
const addRecipes = require('../hooks/app-add-recipes');
const BaseRecipe = new (require('../lib/factory'))().get('_recipe');

describe('app-add-recipes', () => {
  let tmpdir;
  let cwd;
  let app;
  let lando;
  let cached;

  const makeRecipe = (tooling, toolingRoutes) => class extends BaseRecipe {
    constructor(id, options = {}) {
      super(id, {...options, tooling, toolingRoutes, confSrc: path.join(tmpdir, 'conf-src')});
    }
  };

  const configure = (tooling, toolingRoutes, landofileTooling) => {
    app.config.tooling = landofileTooling;
    lando.factory.get = name => name ? makeRecipe(tooling, toolingRoutes) : [{name: 'test'}];
  };

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-app-add-recipes-test-'));
    fs.mkdirSync(path.join(tmpdir, 'app2'), {recursive: true});
    cwd = process.cwd();
    cached = undefined;
    app = {
      config: {recipe: 'test'},
      name: 'test',
      project: 'test',
      recipeCache: 'test.recipe.cache',
      root: tmpdir,
      _config: {userConfRoot: path.join(tmpdir, 'userconf'), home: tmpdir},
      log: {warn() {}, verbose() {}},
    };
    lando = {
      factory: {get: name => name ? undefined : []},
      cache: {set: (key, data) => {
        cached = {key, data};
      }},
      utils: {merge: require('../utils/merge')},
    };
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tmpdir, {force: true, recursive: true});
  });

  it('should cache toolingRoutes and let landofile tooling win over route commands', async () => {
    const app2 = path.join(tmpdir, 'app2');
    const routes = [{route: app2, tooling: {php: {description: 'app2 php'}}}];
    configure(
      {php: {description: 'recipe php', options: {foo: {describe: 'foo'}}}},
      routes,
      {php: {description: 'landofile php'}},
    );

    process.chdir(app2);
    await addRecipes(app, lando);

    expect(cached.key).to.equal('test.recipe.cache');
    expect(cached.data.toolingRoutes).to.deep.equal(routes);
    // the landofile one-field override merged over the route command, recipe options did not leak
    expect(app.config.tooling.php).to.deep.equal({description: 'landofile php'});
  });

  it('should merge landofile tooling over recipe tooling when no route matches', async () => {
    const routes = [{route: path.join(tmpdir, 'app2'), tooling: {php: {description: 'app2 php'}}}];
    configure(
      {php: {description: 'recipe php', options: {foo: {describe: 'foo'}}}},
      routes,
      {php: {description: 'landofile php'}},
    );

    process.chdir(tmpdir);
    await addRecipes(app, lando);

    expect(app.config.tooling.php).to.deep.equal({
      description: 'landofile php',
      options: {foo: {describe: 'foo'}},
    });
  });
});
