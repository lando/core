/*
 * Tests for utils/get-tooling-tasks.
 * @file get-tooling-tasks.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

// Get the module to test
const getToolingTasks = require('../utils/get-tooling-tasks');

describe('get-tooling-tasks', () => {
  it('should build tasks for object commands and skip disabled ones', () => {
    const app = {name: 'test'};
    const tasks = getToolingTasks({php: {cmd: 'php'}, push: 'disabled', drush: false}, app);

    expect(tasks).to.deep.equal([{cmd: 'php', app, name: 'php'}]);
  });
});
