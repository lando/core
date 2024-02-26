'use strict';

const fs = require('fs');
const get = require('lodash/get');
const os = require('os');
const path = require('path');
const semver = require('semver');
const uniqBy = require('lodash/uniqBy');

const {color} = require('listr2');
const {Octokit} = require('@octokit/rest');

const getOS = () => {
  switch (process.platform) {
    case 'darwin':
      return 'macos';
    case 'win32':
      return 'win';
    default:
      return process.platform;
  }
};

// just want to wrap the require so we shave time off of bootstrap
const getPluginClass = ({channel, config, debug} = {}) => {
  const Plugin = require('../components/plugin');
  Plugin.channel = channel;
  Plugin.config = config;
  Plugin.debug = debug;
  return Plugin;
};

module.exports = class UpdateManager {
  constructor({
    config = {},
    cli,
    channel = 'stable',
    debug = require('debug')('@lando/updates'),
    dir = os.tmpdir(),
    plugins = [],
  } = {}) {
    // set things
    this._plugins = plugins;
    this.channel = channel;
    this.cli = cli;
    this.config = config;
    this.dir = dir;
    this.debug = debug;

    // some state stuff
    this.hasChecked = false;
  };

  // translate set plugins when they are set
  set plugins(plugins) {
    const Plugin = getPluginClass({channel: this.channel, config: this.config, debug: this.debug});
    this._plugins = plugins.map(plugin => new Plugin(plugin.dir));
    // if we are cli corebase then we need to reset core plugin stuff
    if (this.internalCore && this.internalCoreVersion) {
      this._plugins.forEach(plugin => {
        if (plugin.package === '@lando/core') {
          plugin.isUpdateable = true;
          plugin.version = this.internalCoreVersion;
        }
      });
    }
  }

  get plugins() {
    return this._plugins;
  }

  /*
   * goes through the instantiated plugins and the cli/core-next if applicable
   * and returns metadata about their release situatuon
   */
  async check() {
    // Start with our basic checks
    const checks = this.plugins.map(async plugin => {
      try {
        await plugin.check4Update();
        return plugin;
      } catch {
        return plugin;
      }
    });

    // special handling for CLI, push cli check here
    if (this.cli && this.cli.plugin) {
      const Plugin = getPluginClass({channel: this.channel, config: this.config, debug: this.debug});
      const cli = this.cli;
      this._cli = new Plugin(cli.plugin);
      this._cli.isCli = true;
      this._cli.isUpdateable = cli.packaged && !cli.source;
      this._cli.installPath = cli.installPath;
      this.internalCore = cli.coreBase;
      this.internalCoreVersion = cli.coreBaseVersion;

      checks.push(new Promise(async resolve => {
        // summon the katkraken
        const octokit = new Octokit({auth: get(process, 'env.GITHUB_TOKEN')});
        // check internet connection
        const online = await require('is-online')();
        // throw error if not online
        if (!online) throw new Error('Cannot detect connection to internet!');
        // just a helper to give consistent prez
        const extra = color.dim('@lando/cli');

        // go for it
        try {
          if (!this._cli.isUpdateable) {
            this.debug(`${extra} is not updateable, update manually`);
            resolve(this._cli);
            return;
          }

          const {data, status, url} = await octokit.rest.repos.listReleases({owner: 'lando', repo: 'cli'});
          this.debug('retrieved cli information from %o [%o]', url, status);

          const versions = data
            .map(release => ({...release, version: semver.clean(release.tag_name)}))
            .filter(release => semver.valid(release.version) !== null)
            .filter(release => semver.satisfies(release.version, '>=3.0.0 <4', {loose: true, includePrerelease: true}))
            .filter(release => release.draft === false)
            .filter(release => this.channel === 'edge' ? true : release.prerelease === false)
            .map(release => release.version);

          // get highest version
          const hv = semver.rsort(versions)[0];

          // cli cannot be updated
          if (semver.lte(hv, this._cli.version)) {
            this.debug(`${extra} cannot be updated on channel %o (%o <= %o)`, this.channel, hv, this._cli.version);
            resolve(this._cli);
            return;

          // otherwise update is available
          } else {
            const arch = ['arm64', 'aarch64'].includes(process.arch) ? 'arm64' : 'x64';
            const os = getOS();
            const ext = process.platform === 'win32' ? '.exe' : '';
            const slim = cli.slim ? '-slim' : '';

            // @NOTE: should this always work?
            const release = data.find(release => release.tag_name === `v${hv}`);
            release.version = hv;
            release.binary = `lando-${os}-${arch}-v${release.version}${slim}${ext}`;
            release.channel = release.prerelease ? 'edge' : 'stable';
            // @NOTE: ditto
            const asset = release.assets.find(asset => asset.name === release.binary);
            // if no asset or url then error
            if (!asset || !asset.url) throw new Error('Could not find suitable download url!');
            release.download = asset.browser_download_url;
            this._cli.updateAvailable = `@lando/cli@${hv}`;
            this._cli.update = release;
            this.debug(
              `${extra} can be updated to %o on channel %o (%o > %o)`,
              release.download,
              this.channel,
              hv,
              this._cli.version,
            );
            resolve(this._cli);
          }

        // error has occured
        } catch (error) {
          if (error.status) error.message = `${error.message} [${error.status}]`;
          if (error.response && error.response.url) error.message = `${error.message} (${error.response.url})`;
          this.debug(`${extra} could not get update info, error: %o`, error.message);
          this.debug('%j', error);
          this._cli.isUpdateable = false;
          this._cli.updateAvailable = false;
          this._cli.update = {error};
          resolve(this._cli);
        }
      }));
    }

    // run all checks and return
    // @NOTE: will have to detangle cli from this?
    this._plugins = await Promise.all(checks);
    this.hasChecked = true;
    return this._plugins;
  }

  // return an array of update tasks we can run
  async getUpdateTasks() {
    // if we havent checked yet then by all means check
    if (!this.hasChecked) await this.check();

    // otherwise lets assembled our tasks
    // start by filtering out any errors/duplicates/updated things
    // @NOTE: we also remove @lando/cli because its update task is special
    const tasks = uniqBy(this.plugins, plugin => plugin.parent ? plugin.parent.name : plugin.name)
      .filter(plugin => plugin.isUpdateable)
      .filter(plugin => plugin.updateAvailable !== false)
      .filter(plugin => plugin.isCli !== true)
      .map(plugin => require('../utils/get-plugin-update-task')(plugin.updateAvailable, {
        dir: this.dir,
        Plugin: this.Plugin,
      }))
      .map(task => require('../utils/parse-setup-task')(task));

    // push cli check here
    if (get(this, '_cli.update.download')) {
      tasks.push(require('../utils/parse-setup-task')({
        title: `Updating @lando/cli to v${this._cli.update.version}`,
        description: '@lando/cli',
        canInstall: async () => {
          // check if user can write to install path
          try {
            fs.accessSync(this._cli.installPath, fs.constants.W_OK);
          } catch {
            throw new Error(`Lando cannot write to ${this._cli.installPath}!`);
          }

          // throw error if not online
          if (!await require('is-online')()) throw new Error('Cannot detect connection to internet!');

          // or true
          return true;
        },
        task: async (ctx, task) => new Promise((resolve, reject) => {
          const url = this._cli.update.download;
          const version = this._cli.update.version;
          const dest = path.join(this._cli.installPath, `lando-v${version}`);
          const sl = process.platform === 'win32'
            ? path.join(this._cli.installPath, 'lando.exe') : path.join(this._cli.installPath, 'lando');
          // @TODO: restore test when we cut 3.22?
          const download = require('../utils/download-x')(url, {debug: this.debug, dest}); // test: ['version']});

          // success
          download.on('done', data => {
            // @NOTE: how does this work on windows?
            // remove existing link if it exists
            if (fs.existsSync(sl)) {
              fs.unlinkSync(sl);
              this.debug('removed existing symlink %o', sl);
            }

            // set/reset
            fs.symlinkSync(dest, sl);
            this.debug('symlinked @lando/cli %o to %o', dest, sl);

            // is sl is not in PATH then attempt to add it
            if (!require('../utils/is-in-path')(sl)) {
              const shellPaths = require('../utils/get-shellenv-paths')(this._cli);
              const shellEnv = require('../utils/get-shellenv')(shellPaths);
              const rcFile = require('../utils/get-shell-profile')();
              require('../utils/update-shell-profile')(rcFile, shellEnv);
              this.debug('added %o to %o', shellEnv, rcFile);
            }

            // finish
            task.title = `Updated @lando/cli to ${version}`;
            resolve(data);
          });
          // handle errors
          download.on('error', error => {
            reject(error);
          });
          // update title to reflect download progress
          download.on('progress', progress => {
            task.title = `Downloading @lando/cli@${version} ${color.dim(`[${progress.percentage}%]`)}`;
          });
        }),
      }));
    }

    // return tasks
    return tasks;
  }

  /*
   * DEPRECATED and for backwards compatibility only
   * returns the cli version only?
   */
  fetch(data) {
    // Return true immediately if update is undefined
    if (!data) return true;
    // Else return based on the expiration
    return !(data.expires >= Math.floor(Date.now()));
  };

  /*
   * DEPRECATED and for backwards compatibility only
   * returns the cli version only?
   */
  async refresh(version, edge = false) {
    const _ = require('lodash');
    const parseData = (latest, version) => ({
      version: _.trimStart(_.get(latest, 'tag_name', version), 'v'),
      url: _.get(latest, 'html_url', ''),
      expires: Math.floor(Date.now()) + 86400000,
    });

    // summon the katkraken
    const octokit = new Octokit({auth: get(process, 'env.GITHUB_TOKEN')});

    // get latest
    try {
      const {data} = await octokit.rest.repos.listReleases({owner: 'lando', repo: 'lando'});
      const latest = _.find(_.get(data, 'data', []), r => (r.draft === false && r.prerelease === edge));
      return parseData(latest, version);
    } catch {
      return parseData(null, version);
    }
  };

  /*
   * DEPRECATED and for backwards compatibility only
   * returns the cli version only?
   */
  updateAvailable(version1, version2) {
    return semver.lt(version1, version2);
  };
};
