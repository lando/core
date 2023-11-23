'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

// get the bosmang
const {Listr} = require('listr2');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = async (tasks, {
  ctx = {},
  fallbackRenderer = 'verbose',
  fallbackRendererOptions = {},
  renderer = 'lando',
  rendererForce = false,
  rendererOptions = {},
  listrOptions = {},
} = {}) => {
  // attempt to reset the renderer if its a string and has a renderer we can load
  if (typeof renderer === 'string' && fs.existsSync(path.resolve(__dirname, '..', 'renderers', `${renderer}.js`))) {
    renderer = require(path.resolve(__dirname, '..', 'renderers', renderer));
  }
  // ditto for fallback renderer
  if (typeof fallbackRenderer === 'string' && fs.existsSync(path.resolve(__dirname, '..', 'renderers', `${fallbackRenderer}.js`))) { // eslint-disable-line max-len
    fallbackRenderer = require(path.resolve(__dirname, '..', 'renderers', fallbackRenderer));
  }

  // if renderer force is on then make sure our fallback is just the normal renderer
  if (rendererForce === true) {
    fallbackRenderer = renderer;
    fallbackRendererOptions = rendererOptions;
  }

  const defaults = {
    ctx: {data: {}, errors: [], results: [], total: 0},
    concurrent: true,
    collectErrors: true,
    exitOnError: false,
    fallbackRenderer,
    fallbackRendererOptions,
    renderer,
    rendererOptions: {
      log: require('debug')('task-runner'),
      collapseSubtasks: false,
      suffixRetries: false,
      showErrorMessage: true,
      taskCount: Array.isArray(tasks) ? tasks.length : 0,
    },
    showErrorMessage: true,
  };

  // construct the runner
  const runner = new Listr(tasks, _.merge({}, defaults, {
    ctx,
    ...listrOptions,
    rendererOptions,
  }));

  // set the task size
  // @NOTE: is this sufficient? do we need some kind of recursion for subtaks?
  runner.options.ctx.total = Array.isArray(runner.tasks) ? runner.tasks.length : 0;
  // also add the runner to ctx so we can access other tasks and stuff
  runner.options.ctx.runner = runner;

  // runer gonna run
  return await runner.run();
};

