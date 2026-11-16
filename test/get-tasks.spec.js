/*
 * Tests for utils/get-tasks.
 * @file get-tasks.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const fs = require('fs');
const os = require('os');
const path = require('path');

// Get the module to test
const getTasks = require('../utils/get-tasks');

describe('get-tasks', () => {
  let tmpdir;
  let cwd;
  let originalTaskCacheFile;

  const writeRecipe = recipe => {
    const file = path.join(tmpdir, 'test.recipe.cache');
    fs.writeFileSync(file, JSON.stringify(recipe));
    return file;
  };

  const findTask = (tasks, command) => tasks.find(task => task.command === command);

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-get-tasks-test-'));
    fs.mkdirSync(path.join(tmpdir, 'app2'), {recursive: true});
    cwd = process.cwd();
    originalTaskCacheFile = process.landoTaskCacheFile;
    // point core task loading at a file that does not exist so it yields no core tasks
    process.landoTaskCacheFile = path.join(tmpdir, 'does-not-exist.tasks.cache');
  });

  afterEach(() => {
    process.chdir(cwd);
    if (originalTaskCacheFile === undefined) delete process.landoTaskCacheFile;
    else process.landoTaskCacheFile = originalTaskCacheFile;
    fs.rmSync(tmpdir, {force: true, recursive: true});
  });

  it('should let landofile tooling win over route commands on the warm path', () => {
    const app2 = path.join(tmpdir, 'app2');
    const recipeCache = writeRecipe({
      tooling: {php: {description: 'recipe php', options: {foo: {describe: 'foo'}}}},
      toolingRoutes: [{route: app2, tooling: {php: {description: 'app2 php'}}}],
    });

    process.chdir(app2);
    const tasks = getTasks({recipe: 'test', recipeCache, tooling: {php: {description: 'landofile php'}}}, {_: []});
    const php = findTask(tasks, 'php');
    expect(php.describe).to.equal('landofile php');
    // the landofile one-field override merged over the route command, recipe options did not leak
    expect(php.options).to.deep.equal({});
  });

  it('should apply the route without landofile tooling and the recipe without a matching route', () => {
    const app2 = path.join(tmpdir, 'app2');
    const recipeCache = writeRecipe({
      tooling: {php: {description: 'recipe php', options: {foo: {describe: 'foo'}}}},
      toolingRoutes: [{route: app2, tooling: {php: {description: 'app2 php'}}}],
    });

    process.chdir(app2);
    let php = findTask(getTasks({recipe: 'test', recipeCache, tooling: {}}, {_: []}), 'php');
    expect(php.describe).to.equal('app2 php');
    expect(php.options).to.deep.equal({});

    process.chdir(tmpdir);
    php = findTask(getTasks({recipe: 'test', recipeCache, tooling: {}}, {_: []}), 'php');
    expect(php.describe).to.equal('recipe php');
    expect(php.options).to.deep.equal({foo: {describe: 'foo'}});
  });

  it('should let route false markers hide recipe commands unless landofile tooling brings them back', () => {
    const app2 = path.join(tmpdir, 'app2');
    const recipeCache = writeRecipe({
      tooling: {php: {description: 'recipe php'}, node: {description: 'recipe node'}},
      toolingRoutes: [{route: app2, tooling: {php: false}}],
    });

    process.chdir(app2);
    let tasks = getTasks({recipe: 'test', recipeCache, tooling: {}}, {_: []});
    expect(findTask(tasks, 'php')).to.equal(undefined);
    expect(findTask(tasks, 'node').describe).to.equal('recipe node');

    tasks = getTasks({recipe: 'test', recipeCache, tooling: {php: {description: 'landofile php'}}}, {_: []});
    expect(findTask(tasks, 'php').describe).to.equal('landofile php');
  });

  it('should fall back to the legacy tooling router when the recipe cache has no toolingRoutes', () => {
    const app2 = path.join(tmpdir, 'app2');
    const toolingRouter = path.join(tmpdir, 'test.tooling.router');
    const routes = [{route: app2, tooling: {php: {description: 'legacy php'}}}];
    fs.writeFileSync(toolingRouter, JSON.stringify(JSON.stringify(routes)));
    const recipeCache = writeRecipe({tooling: {php: {description: 'recipe php'}}});

    process.chdir(app2);
    let php = findTask(getTasks({recipe: 'test', recipeCache, toolingRouter, tooling: {}}, {_: []}), 'php');
    expect(php.describe).to.equal('legacy php');

    php = findTask(getTasks({recipe: 'test', recipeCache, toolingRouter, tooling: {php: {description: 'landofile php'}}}, {_: []}), 'php');
    expect(php.describe).to.equal('landofile php');
  });

  it('should ignore the legacy tooling router when the recipe cache publishes empty toolingRoutes', () => {
    const app2 = path.join(tmpdir, 'app2');
    const toolingRouter = path.join(tmpdir, 'test.tooling.router');
    const routes = [{route: app2, tooling: {php: {description: 'legacy php'}}}];
    fs.writeFileSync(toolingRouter, JSON.stringify(JSON.stringify(routes)));
    const recipeCache = writeRecipe({
      tooling: {php: {description: 'recipe php'}},
      toolingRoutes: [],
    });

    process.chdir(app2);
    const php = findTask(getTasks({recipe: 'test', recipeCache, toolingRouter, tooling: {}}, {_: []}), 'php');
    expect(php.describe).to.equal('recipe php');
  });

  it('should deep merge landofile tooling over recipe tooling when there are no routes', () => {
    const recipeCache = writeRecipe({
      tooling: {php: {description: 'recipe php', options: {foo: {describe: 'foo'}}}},
    });

    process.chdir(tmpdir);
    const php = findTask(getTasks({recipe: 'test', recipeCache, tooling: {php: {description: 'mine'}}}, {_: []}), 'php');
    expect(php.describe).to.equal('mine');
    expect(php.options).to.deep.equal({foo: {describe: 'foo'}});
  });
});
