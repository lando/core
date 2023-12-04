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
    this.config = config;
    this.dir = dir;
    this.debug = debug;
    this.Plugin = require('../components/plugin');

    // reset Plugin static defaults for v3 purposes
    this.Plugin.channel = channel;
    this.Plugin.config = config;
    this.Plugin.debug = debug;

    // special handling for CLI
    // @NOTE: we pretend its a plugin just to get some object consistency between our things
    if (cli && cli.plugin) {
      this._cli = new this.Plugin(cli.plugin);
      this._cli.isCli = true;
      this._cli.isUpdateable = cli.packaged && !cli.source;
      this._cli.installPath = cli.installPath;
      this.internalCore = cli.coreBase;
      this.internalCoreVersion = cli.coreBaseVersion;
    }

    // some state stuff
    this.hasChecked = false;
  };

  // translate set plugins when they are set
  set plugins(plugins) {
    this._plugins = plugins.map(plugin => new this.Plugin(plugin.dir));
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

    // push cli check here
    if (this._cli && this._cli.isCli) {
      checks.push(new Promise(async resolve => {
        // summon the katkraken
        const octokit = new Octokit({auth: get(process, 'env.GITHUB_TOKEN')});
        // check internet connection
        const online = await require('is-online')();
        // throw error if not online
        if (!online) throw new Error('Cannot detect connection to internet!');

        // go for it
        try {
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
            this.debug(`'@lando/cli' cannot be updated on channel %o (%o <= %o)`, this.channel, hv, this._cli.version);
            resolve(this._cli);

          // otherwise update is available
          } else {
            const arch = ['arm64', 'aarch64'].includes(process.arch) ? 'arm64' : 'x64';
            const os = getOS();
            const ext = process.platform === 'win32' ? '.exe' : '';

            // @NOTE: should this always work?
            const release = data.find(release => release.tag_name === `v${hv}`);
            release.version = hv;
            release.binary = `lando-${os}-${arch}-v${release.version}${ext}`;
            release.channel = release.prerelease ? 'edge' : 'stable';
            // @NOTE: ditto
            const asset = release.assets.find(asset => asset.name === release.binary);
            // if no asset or url then error
            if (!asset || !asset.url) throw new Error('Could not find suitable download url!');
            release.download = asset.browser_download_url;
            this._cli.updateAvailable = `@lando/cli@${hv}`;
            this._cli.update = release;
            this.debug(
              `'@lando/cli' can be updated to %o on channel %o (%o > %o)`,
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
          this.debug(`'@lando/cli' could not get update info, error: %o`, error.message);
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
          const online = await require('is-online')();
          // throw error if not online
          if (!online) throw new Error('Cannot detect connection to internet!');
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
            fs.symlinkSync(dest, sl);
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
