'use strict';

const slugify = require('slugify');

const {color} = require('listr2');

const defaults = task => ({
  canInstall: async () => true,
  canRun: async () => true,
  comments: {},
  count: true,
  dependsOn: [],
  description: task.title,
  hasRun: async () => false,
  id: slugify(task.title),
  isInstalled: async () => false,
  requiresRestart: false,
});

/*
 * TBD
 */
module.exports = otask => {
  // first make sure task is sufficiently defined
  // @TODO: post-install-notes?
  otask = {...defaults(otask), ...otask};

  // get the parent task
  const orunner = otask.task;

  // lets rework the task to accomodate some setup things
  otask.task = async (ctx, task) => {
    try {
      // checks
      await otask.canInstall();
      await otask.canRun();

      // if requires restart is a function then run it to reset teh task
      if (typeof otask.requiresRestart === 'function') otask.requiresRestart = await otask.requiresRestart(ctx, task);

      // get some helpful things for downstream
      const initialTitle = task.task.initialTitle ?? task.task.title;

      // if we have a dependsOn we need to just CHILLTFO untill dependees are good
      if (Array.isArray(otask.dependsOn) && otask.dependsOn.length > 0) {
        // get our dependants
        const dependees = ctx.runner.tasks.filter(task => otask.dependsOn.includes(task.task.id));
        const dids = dependees.map(dependee => dependee.task.id);

        // update title to reflect pending
        task.title = `${initialTitle} ${color.dim(`[Needs ${dids.join(', ')}]`)}`;
        task.task.state = 'WAITING';

        // wait until all tasks close, for good or ill
        try {
          await Promise.all(dependees.map(async dependee => new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
            // if they are already installed then just move on
            if (await dependee.task.hasRun()) resolve(dependee);
            else if (await dependee.task.isInstalled()) resolve(dependee);
            else {
              dependee.on('CLOSED', () => {
                if (dependee.state === 'COMPLETED') resolve(dependee);
                else reject(dependee);
              });
            }
          })));
        } catch (dependee) {
          const id = dependee.task.id;
          task.skip(`Skipped due to failure in ${id}! Rerun setup with -vvv or --debug for more info!`);
          return;
        }
      }

      // main event
      task.title = initialTitle;
      task.task.state = 'STARTED';
      const result = await orunner(ctx, task);
      // harvest
      if (otask.count) ctx.results.push(result);
      return result;
    } catch (error) {
      if (otask.count) ctx.errors.push(error);
      throw error;
    }
  };

  // also skip the task if its already been set and skip has not been set
  if (!otask.enabled) otask.enabled = async () => !await otask.isInstalled() && !await otask.hasRun();

  // but actually wrap enabled in something else so we can make sure it resolves to a boolean
  if (otask.enabled && typeof otask.enabled === 'function') {
    const penabled = otask.enabled;
    otask.enabled = async () => {
      otask.enabled = await penabled();
    };
  }

  // return
  return otask;
};
