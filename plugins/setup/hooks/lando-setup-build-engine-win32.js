'use strict';

const os = require('os');
const path = require('path');
const semver = require('semver');

const {color} = require('listr2');
const {nanoid} = require('nanoid');

const buildIds = {
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
  return `https://desktop.docker.com/win/main/${arch}/${id}/Docker%20Desktop%20Installer.exe`;
};

/*
 * wrapper for docker-desktop install
 */
const downloadDockerDesktop = (url, {debug, task, ctx}) => new Promise((resolve, reject) => {
  const download = require('../../../utils/download-x')(url, {
    debug,
    dest: path.join(os.tmpdir(), `${nanoid()}.exe`),
  });

  // success
  download.on('done', result => {
    task.title = `Downloaded build engine`;
    ctx.run++;
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
  const debug = require('../../../utils/debug-shim')(lando.log);
  // get stuff from config/opts
  const build = getId(options.buildEngine);
  const version = getVersion(options.buildEngine);
  // cosmetics
  const buildEngine = process.platform === 'linux' ? 'docker-engine' : 'docker-desktop';
  const install = version ? `v${version}` : `build ${build}`;

  // build base install task
  const installCommand = [path.join(lando.config.userConfRoot, 'scripts', 'install-docker-desktop.ps1')];

  // add optional install args as proper
  if (options.buildEngineAcceptLicense) installCommand.push('-acceptlicense');
  if (options.debug || options.verbose > 0) installCommand.push('-debug');

  // win32 install docker desktop task
  options.tasks.push({
    title: `Downloading build engine`,
    id: 'setup-build-engine',
    description: `@lando/build-engine (${buildEngine})`,
    required: true,
    version: `${buildEngine} ${install}`,
    hasRun: async () => {
      // start by looking at the engine install status
      // @NOTE: is this always defined?
      if (lando.engine.dockerInstalled === false) return false;

      // if we get here let's make sure the engine is on
      try {
        await lando.engine.daemon.up();
        const BuildEngine = require('../../../components/docker-engine');
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
      // @TODO: check for wsl2?
      return true;
    },
    task: async (ctx, task) => {
      try {
        // download the installer
        ctx.download = await downloadDockerDesktop(getEngineDownloadUrl(build), {ctx, debug, task});
        // add the installer to the install command
        installCommand.push('-installer');
        installCommand.push(ctx.download.dest);

        // run install command
        task.title = `Installing build engine ${color.dim('(this may take a minute)')}`;
        const thing = await require('../../../utils/run-powershell-script')(installCommand, {debug});
        console.log(thing);

        // finish up
        const location = process.env.ProgramW6432 ?? process.env.ProgramFiles;
        task.title = `Installed build engine to ${location}/Docker/Docker!`;

      // push any errorz
      } catch (error) {
        ctx.errors.push(error);
        throw new Error(error.message);
      }
    },
  });
};
