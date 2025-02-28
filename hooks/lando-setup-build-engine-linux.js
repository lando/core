'use strict';

const axios = require('../utils/get-axios')();
const os = require('os');
const path = require('path');

const {color} = require('listr2');

const downloadDockerEngine = (url = 'https://get.docker.com', {debug, task}) => new Promise((resolve, reject) => {
  const download = require('../utils/download-x')(url, {debug});

  // success
  download.on('done', result => {
    task.title = `Downloaded build engine`;
    resolve(result);
  });
  // handle errors
  download.on('error', error => {
    reject(error);
  });
  // update title to reflect download progress
  download.on('progress', progress => {
    task.title = `Downloading build engine ${color.dim(`[${progress.percentage}%]`)}`;
  });
});

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);
  // if build engine is set to false allow it to be skipped
  // @NOTE: this is mostly for internal stuff
  if (options.buildEngine === false) return;

  const version = options.buildEngine;
  const url = 'https://get.docker.com';

  // darwin install task
  options.tasks.push({
    title: `Installing build engine`,
    id: 'setup-build-engine',
    description: `@lando/build-engine (docker-engine)`,
    version: `Docker Engine ${version}`,
    hasRun: async () => {
      // start by looking at the engine install status
      // @NOTE: is this always defined?
      if (lando.engine.dockerInstalled === false) return false;

      // if we get here let's make sure the engine is on
      try {
        await lando.engine.daemon.up({max: 1, backoff: 1000});
        return true;
      } catch (error) {
        lando.log.debug('docker install task has not run %j', error);
        return false;
      }
    },
    canRun: async () => {
      // throw if we cannot resolve a semantic version to a buildid
      if (!version) throw new Error(`Could not resolve ${version} to an installable version!`);
      // throw error if we cannot ping the download link
      await axios.head(url);
      // throw if user is not an admin
      if (!await require('../utils/is-admin-user')()) {
        throw new Error([
          `User "${lando.config.username}" does not have permission to install the build engine!`,
          'Contact your system admin for permission and then rerun setup.',
        ].join(os.EOL));
      }

      return true;
    },
    task: async (ctx, task) => {
      // download the installer
      ctx.download = await downloadDockerEngine(url, {ctx, debug, task});

      // prompt for password if interactive and we dont have it
      if (ctx.password === undefined && lando.config.isInteractive) {
        ctx.password = await task.prompt({
          type: 'password',
          name: 'password',
          message: `Enter computer password for ${lando.config.username} to install the build engine`,
          validate: async input => {
            const options = {debug, ignoreReturnCode: true, password: input};
            const response = await require('../utils/run-elevated')(['echo', 'hello there'], options);
            if (response.code !== 0) return response.stderr;
            return true;
          },
        });
      }

      task.title = `Installing build engine ${color.dim('(this may take a minute)')}`;
      // assemble
      const script = path.join(lando.config.userConfRoot, 'scripts', 'install-docker-engine.sh');
      const command = [script, '--installer', ctx.download.dest, '--version', version];

      // add optional args
      if (options.debug || options.verbose > 0 || lando.debuggy) command.push('--debug');

      // run
      const result = await require('../utils/run-elevated')(command, {debug, password: ctx.password});
      result.download = ctx.download;

      // finish up
      task.title = 'Installed build engine (Docker Engine) to /usr/bin/docker';
      return result;
    },
  });

  // group add
  options.tasks.push({
    title: `Adding ${lando.config.username} to docker group`,
    id: 'setup-build-engine-group',
    dependsOn: ['setup-build-engine'],
    description: `@lando/build-engine-group (${lando.config.username}@docker)`,
    comments: {
      'NOT INSTALLED': `Will add ${lando.config.username} to docker group`,
    },
    hasRun: async () => require('../utils/is-group-member')('docker'),
    requiresRestart: true,
    task: async (ctx, task) => {
      // check one last time incase this was added by a dependee or otherwise
      if (require('../utils/is-group-member')('docker')) return {code: 0};

      // prompt for password if interactive and we dont have it
      if (ctx.password === undefined && lando.config.isInteractive) {
        ctx.password = await task.prompt({
          type: 'password',
          name: 'password',
          message: `Enter computer password for ${lando.config.username} to add them to docker group`,
          validate: async input => {
            const options = {debug, ignoreReturnCode: true, password: input};
            const response = await require('../utils/run-elevated')(['echo', 'hello there'], options);
            if (response.code !== 0) return response.stderr;
            return true;
          },
        });
      }

      const script = path.join(lando.config.userConfRoot, 'scripts', 'add-to-group.sh');
      const command = [script, '--user', lando.config.username, '--group', 'docker'];
      const response = await require('../utils/run-elevated')(command, {debug, password: ctx.password});
      task.title = `Added ${lando.config.username} to docker group`;
      return response;
    },
  });
};
