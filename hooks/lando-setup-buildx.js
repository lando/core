'use strict';

const axios = require('../utils/get-axios')();
const fs = require('fs');
const path = require('path');

/*
 * Helper to get buildx download url
 */
const getBuildxDownloadUrl = (version = '0.30.1') => {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';

  switch (process.platform) {
    case 'darwin':
      return `https://github.com/docker/buildx/releases/download/v${version}/buildx-v${version}.darwin-${arch}`;
    case 'linux':
      return `https://github.com/docker/buildx/releases/download/v${version}/buildx-v${version}.linux-${arch}`;
    case 'win32':
      return `https://github.com/docker/buildx/releases/download/v${version}/buildx-v${version}.windows-${arch}.exe`;
  }
};

/*
 * Helper to get buildx download destination
 */
const getBuildxDownloadDest = home => {
  const dir = path.join(home, '.docker', 'cli-plugins');
  switch (process.platform) {
    case 'linux':
    case 'darwin':
      return path.join(dir, 'docker-buildx');
    case 'win32':
      return path.join(dir, 'docker-buildx.exe');
  }
};

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);
  const {color} = require('listr2');

  // get stuff from config/opts
  const {home} = lando.config;
  const {buildx} = options;

  // if buildx is set to false allow it to be skipped
  if (buildx === false) return;

  const dest = getBuildxDownloadDest(home);
  const url = getBuildxDownloadUrl(buildx);

  options.tasks.push({
    title: `Downloading buildx`,
    id: 'setup-buildx',
    dependsOn: ['setup-build-engine'],
    description: '@lando/buildx (docker-buildx)',
    version: `Docker Buildx v${buildx}`,
    hasRun: async () => {
      try {
        await require('../utils/run-command')('docker', ['buildx', 'version'], {debug});
        return true;
      } catch {
        return false;
      }
    },
    canRun: async () => {
      // throw error if we cannot ping the download link
      await axios.head(url);
      // true if we get here
      return true;
    },
    task: async (ctx, task) => new Promise((resolve, reject) => {
      // ensure the cli-plugins directory exists
      fs.mkdirSync(path.dirname(dest), {recursive: true});

      const download = require('../utils/download-x')(url, {debug, dest, test: ['version']});
      // success
      download.on('done', data => {
        task.title = `Installed buildx (Docker Buildx) to ${dest}`;
        resolve(data);
      });
      // handle errors
      download.on('error', error => {
        reject(error);
      });
      // update title to reflect download progress
      download.on('progress', progress => {
        task.title = `Downloading buildx ${color.dim(`[${progress.percentage}%]`)}`;
      });
    }),
  });
};
