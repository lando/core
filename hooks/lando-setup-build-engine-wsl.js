'use strict';

const axios = require('../utils/get-axios')();
const fs = require('fs');
const getDockerDesktopBin = require('../utils/get-docker-desktop-x');
const getWinEnvar = require('../utils/get-win32-envvar-from-wsl');
const path = require('path');
const semver = require('semver');
const wslpath = require('../utils/winpath-2-wslpath');

const {color} = require('listr2');
const {nanoid} = require('nanoid');

const buildIds = {
  '4.37.1': '178610',
  '4.37.0': '178034',
  '4.36.0': '175267',
  '4.35.1': '173168',
  '4.35.0': '172550',
  '4.34.3': '170107',
  '4.34.2': '167172',
  '4.34.1': '166053',
  '4.34.0': '165256',
  '4.33.1': '161083',
  '4.33.0': '160616',
  '4.32.0': '157355',
  '4.31.1': '153621',
  '4.31.0': '153195',
  '4.30.0': '149282',
  '4.29.0': '145265',
  '4.28.0': '139021',
  '4.27.2': '137060',
  '4.27.1': '136059',
  '4.27.0': '135262',
  '4.26.1': '131620',
  '4.26.0': '130397',
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
const getEngineDownloadUrl = (id = '175267') => {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  return `https://desktop.docker.com/win/main/${arch}/${id}/Docker%20Desktop%20Installer.exe`;
};

/*
 * wrapper for docker-desktop install
 */
const downloadDockerDesktop = (url, {debug, dest, task, ctx}) => new Promise((resolve, reject) => {
  const download = require('../utils/download-x')(url, {
    debug,
    dest: path.posix.join(dest, `${nanoid()}.exe`),
  });

  // success
  download.on('done', result => {
    task.title = `Downloaded build engine`;
    resolve(result);
  });
  // handle errors
  download.on('error', error => {
    ctx.errors.push(error);
    reject(error);
  });
  // update title to reflect download progress
  download.on('progress', progress => {
    task.title = `Downloading build engine ${color.dim(`[${progress.percentage}%]`)}`;
  });
});

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);
  debug.enabled = lando.debuggy;

  // if build engine is set to false allow it to be skipped
  // @NOTE: this is mostly for internal stuff
  if (options.buildEngine === false) return;

  // get stuff from config/opts
  const build = getId(options.buildEngine);
  const version = getVersion(options.buildEngine);

  // cosmetics
  const install = version ? `v${version}` : `build ${build}`;

  // download url
  const url = getEngineDownloadUrl(build);

  // win32 install docker desktop task
  options.tasks.push({
    title: 'Downloading build engine',
    id: 'setup-build-engine',
    description: '@lando/build-engine (docker-desktop)',
    version: `Docker Desktop ${install}`,
    hasRun: async () => {
      // if we are missing the docker desktop executable then false
      if (!fs.existsSync(getDockerDesktopBin())) return false;

      // if we get here let's make sure the engine is on
      try {
        await lando.engine.daemon.up({max: 3, backoff: 1000});
        return true;
      } catch (error) {
        lando.log.debug('docker install task has not run %j', error);
        return false;
      }
    },
    canRun: async () => {
      // throw if we cannot resolve a semantic version to a buildid
      if (!build) throw new Error(`Could not resolve ${install} to an installable version!`);
      // throw error if we cannot ping the download link
      await axios.head(url);
      // @TODO: check for wsl2?
      return true;
    },
    task: async (ctx, task) => {
      // get tmp dir from windows side
      const winTmpDir = getWinEnvar('TEMP', {debug});
      const dest = wslpath(winTmpDir);
      debug('resolved win dir %o to wsl path %o', winTmpDir, dest);

      // download the installer
      ctx.download = await downloadDockerDesktop(url, {ctx, debug, dest, task});
      ctx.download.windest = path.win32.join(winTmpDir, path.basename(ctx.download.dest));

      // script
      const script = path.posix.join(lando.config.userConfRoot, 'scripts', 'install-docker-desktop.ps1');
      // args
      const args = ['-Installer', ctx.download.windest];
      if (options.buildEngineAcceptLicense) args.push('-AcceptLicense');
      if ((options.debug || options.verbose > 0 || lando.debuggy) && lando.config.isInteractive) args.push('-Debug');

      // run install command
      task.title = `Installing build engine ${color.dim('(this may take a minute)')}`;
      const result = await require('../utils/run-powershell-script')(script, args, {debug});
      result.download = ctx.download;

      // finish up
      const location = getWinEnvar('ProgramW6432') ?? getWinEnvar('ProgramFiles');
      task.title = `Installed build engine (Docker Desktop) to ${location}/Docker/Docker!`;
      return result;
    },
  });

  // add docker group add task
  options.tasks.push({
    title: `Adding ${lando.config.username} to docker group`,
    id: 'setup-build-engine-group',
    dependsOn: ['setup-build-engine'],
    description: `@lando/build-engine-group (${lando.config.username}@docker)`,
    requiresRestart: true,
    comments: {
      'NOT INSTALLED': `Will add ${lando.config.username} to docker group`,
    },
    hasRun: async () => require('../utils/is-group-member')('docker'),
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

