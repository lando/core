'use strict';

const slugify = require('slugify');

const defaults = task => ({
  dependsOn: [],
  description: task.title,
  id: slugify(task.title),
  isInstalled: async () => false,
  hasRun: async () => false,
  canInstall: async () => true,
  canRun: async () => true,
});

/*
 * TBD
 */
module.exports = otask => {
  // first make sure task is sufficiently defined
    // dependsOn:
    // skipFlags?
    // post-install-notes?
  otask = {...defaults(otask), ...otask};

  // get the parent task
  const orunner = otask.task;

  // lets rework the task to accomodate some setup things
  otask.task = async (ctx, task) => {
    try {
      // checks
      await otask.canInstall();
      await otask.canRun();
      // main event
      const result = await orunner(ctx, task);
      // harvest
      ctx.results.push(result);
      return result;
    } catch (error) {
      ctx.errors.push(error);
      throw error;
    }
  };

  // also skip the task if its already been set and skip has not been set
  if (!otask.enabled) otask.enabled = async () => !await otask.isInstalled() && !await otask.hasRun();

  // return
  return otask;
};
