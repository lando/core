'use strict';

const fs = require('fs');
const path = require('path');

/*
 * Helper to get docker compose v2 download url
 */
const getComposeDownloadUrl = (version = '2.21.0') => {
  const mv = version.split('.')[0] > 1 ? '2' : '1';
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const toggle = `${process.platform}-${mv}`;

  switch (toggle) {
    case 'darwin-2':
      return `https://github.com/docker/compose/releases/download/v${version}/docker-compose-darwin-${arch}`;
    case 'linux-2':
      return `https://github.com/docker/compose/releases/download/v${version}/docker-compose-linux-${arch}`;
    case 'win32-2':
      return `https://github.com/docker/compose/releases/download/v${version}/docker-compose-windows-${arch}.exe`;
    case 'darwin-1':
      return `https://github.com/docker/compose/releases/download/${version}/docker-compose-Darwin-x86_64`;
    case 'linux-1':
      return `https://github.com/docker/compose/releases/download/${version}/docker-compose-Linux-x86_64`;
    case 'win32-1':
      return `https://github.com/docker/compose/releases/download/${version}/docker-compose-Windows-x86_64.exe`;
  }
};

/*
 * Helper to get docker compose v2 download destination
 */
const getComposeDownloadDest = (base, version = '2.21.0') => {
  switch (process.platform) {
    case 'linux':
    case 'darwin':
      return path.join(base, `docker-compose-v${version}`);
    case 'win32':
      return path.join(base, `docker-compose-v${version}.exe`);
  }
};

module.exports = async (lando, options, tasks) => {
  // get stuff from config/opts
  const {orchestratorBin, userConfRoot} = lando.config;
  const {noOrchestrator, orchestrator} = options;
  const dest = getComposeDownloadDest(path.join(userConfRoot, 'bin'), orchestrator);

  // if we dont have a orchestratorBin or havent downloaded orchestratorVersion yet
  if (!noOrchestrator && !!!orchestratorBin && typeof orchestrator === 'string' && !fs.existsSync(dest)) {
    lando.log.debug('could not detect docker-compose v%s!', orchestrator);
    const url = getComposeDownloadUrl(orchestrator);
    const debug = require('../utils/debug-shim')(lando.log);
    const {color} = require('listr2');

    tasks.push({
      title: `Downloading orchestrator`,
      task: async (ctx, task) => new Promise((resolve, reject) => {
        const download = require('../utils/download-x')(url, {debug, dest, test: ['--version']});
        // success
        download.on('done', () => {
          task.title = `Installed orchestrator to ${dest}`;
          resolve();
        });
        // handle errors
        download.on('error', error => {
          ctx.errors.push(error);
          reject(error);
        });
        // update title to reflect download progress
        download.on('progress', progress => {
          task.title = `Downloading orchestrator ${color.dim(`[${progress.percentage}%]`)}`;
        });
      }),
    });
  }
};
