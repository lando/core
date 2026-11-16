/*
 * Tests for utils/apply-tooling-route.
 * @file apply-tooling-route.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const os = require('os');
const path = require('path');

// Get the module to test
const applyToolingRoute = require('../utils/apply-tooling-route');

describe('apply-tooling-route', () => {
  // route selection only compares paths, so nothing needs to exist on disk
  const root = path.resolve(os.tmpdir(), 'lando-apply-tooling-route-test');

  it('should return the same tooling and no route when there are no routes', () => {
    const tooling = {php: {description: 'recipe php'}};

    const undefinedResult = applyToolingRoute(tooling, undefined);
    expect(undefinedResult.route).to.equal(undefined);
    expect(undefinedResult.tooling).to.equal(tooling);

    const emptyResult = applyToolingRoute(tooling, []);
    expect(emptyResult.route).to.equal(undefined);
    expect(emptyResult.tooling).to.equal(tooling);
  });

  it('should return the same tooling when no route contains the cwd', () => {
    const tooling = {php: {description: 'recipe php'}};
    const routes = [{route: path.join(root, 'other'), tooling: {php: false}}];

    const result = applyToolingRoute(tooling, routes, path.join(root, 'app'));
    expect(result.route).to.equal(undefined);
    expect(result.tooling).to.equal(tooling);
  });

  it('should apply the deepest route containing the cwd', () => {
    const routes = [
      {route: root, tooling: {php: {description: 'root php'}}},
      {route: path.join(root, 'app2'), tooling: {php: {description: 'app2 php'}}},
    ];

    const nested = applyToolingRoute({}, routes, path.join(root, 'app2', 'src'));
    expect(nested.route.route).to.equal(path.join(root, 'app2'));
    expect(nested.route.closeness).to.equal(1);
    expect(nested.tooling.php.description).to.equal('app2 php');

    const exact = applyToolingRoute({}, routes, path.join(root, 'app2'));
    expect(exact.route.route).to.equal(path.join(root, 'app2'));
    expect(exact.route.closeness).to.equal(0);
  });

  it('should replace route commands whole and keep false markers', () => {
    const tooling = {
      php: {dir: '/app', options: {foo: {describe: 'foo'}}},
      node: {description: 'recipe node'},
      redis: {description: 'recipe redis'},
    };
    const routes = [{route: root, tooling: {php: {description: 'route php'}, redis: false}}];

    const result = applyToolingRoute(tooling, routes, root);
    expect(result.tooling.php).to.deep.equal({description: 'route php'});
    expect(result.tooling.node).to.deep.equal({description: 'recipe node'});
    expect(result.tooling.redis).to.equal(false);
    // the recipe tooling passed in is not mutated
    expect(tooling.php).to.deep.equal({dir: '/app', options: {foo: {describe: 'foo'}}});
  });

  it('should ignore a matching route without tooling', () => {
    const tooling = {php: {description: 'recipe php'}};
    const routes = [{route: root}];

    const result = applyToolingRoute(tooling, routes, root);
    expect(result.route).to.equal(undefined);
    expect(result.tooling).to.equal(tooling);
  });
});
