'use strict';

const os = require('os');
const path = require('path');
const semver = require('semver');

const {color} = require('listr2');

const buildIds = {
  '4.25.2': '129061',
  '4.25.1': '128006',
  '4.25.0': '126437',
};

/*
 * Helper to get build engine id
 */
const getId = version => {
  // if version is an integer then assume its already the id
  if (semver.valid(version) === null && Number.isInteger(parseInt(version))) return version;
  // otherwise return that corresponding build-id
  return buildIds[version];
};

const getVersion = version => {
  // if version is not an integer then assume its already the version
  if (semver.valid(version) !== null) return version;
  // otherwise return the version that corresponds to the build id
  return Object.keys(buildIds).find(key => buildIds[key] === version);
};

/*
 * Helper to get docker compose v2 download url
 */
const getEngineDownloadUrl = (id = '126437') => {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  return `https://desktop.docker.com/mac/main/${arch}/${id}/Docker.dmg`;
};

/*
 * wrapper for docker-desktop install
 */
const downloadDockerDesktop = (url, {debug, task, ctx}) => new Promise((resolve, reject) => {
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
  // get stuff from config/opts
  const build = getId(options.buildEngine);
  const version = getVersion(options.buildEngine);
  // cosmetics
  const install = version ? `v${version}` : `build ${build}`;

  // darwin install task
  options.tasks.push({
    title: `Downloading build engine`,
    id: 'setup-build-engine',
    description: `@lando/build-engine (docker-desktop)`,
    required: true,
    version: `docker-desktop ${install}`,
    hasRun: async () => {
      // start by looking at the engine install status
      // @NOTE: is this always defined?
      if (lando.engine.dockerInstalled === false) return false;

      // if we get here let's make sure the engine is on
      try {
        await lando.engine.daemon.up();
        const BuildEngine = require('../components/docker-engine');
        const bengine = new BuildEngine(lando.config.buildEngine, {debug});
        await bengine.info();
        return true;
      } catch (error) {
        lando.log.debug('docker install task has not run %j', error);
        return false;
      }
    },
    canRun: async () => {
      // throw if we cannot resolve a semantic version to a buildid
      if (!build) throw new Error(`Could not resolve ${install} to an installable version!`);
      // throw error if not online
      if (!await require('is-online')()) throw new Error('Cannot detect connection to internet!');
      // throw if user is not an admin
      if (!await require('../utils/is-admin-user')()) {
        throw new Error([
          `User "${os.userInfo().username}" does not have permission to install the build engine!`,
          'Contact your system admin for permission and then rerun setup.',
        ].join(os.EOL));
      }

      return true;
    },
    task: async (ctx, task) => {
      try {
        // download the installer
        ctx.download = await downloadDockerDesktop(getEngineDownloadUrl(build), {ctx, debug, task});

        // prompt for password if interactive
        if (require('is-interactive')) {
          ctx.password = await task.prompt({
            type: 'password',
            name: 'password',
            message: `Enter computer password for ${lando.config.username} to install build engine`,
            validate: async (input, state) => {
              const options = {debug, ignoreReturnCode: true, password: input};
              const response = await require('../utils/run-elevated')(['echo', 'hello there'], options);
              if (response.code !== 0) return response.stderr;
              return true;
            },
          });
        }

        task.title = `Installing build engine ${color.dim('(this may take a minute)')}`;

        // assemble
        const script = path.join(lando.config.userConfRoot, 'scripts', 'install-docker-desktop.sh');
        const command = [script, '--installer', ctx.download.dest, '--user', lando.config.username];

        // add optional args
        if (options.buildEngineAcceptLicense) command.push('--accept-license');
        if (options.debug || options.verbose > 0) command.push('--debug');

        // run
        const result = await require('../utils/run-elevated')(command, {debug, password: ctx.password});
        result.download = ctx.download;

        // finish up
        task.title = 'Installed build engine to /Applications/Docker.app';
        return result;
      } catch (error) {
        throw error;
      }
    },
  });
};
