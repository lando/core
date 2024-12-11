'use strict';

const axios = require('../utils/get-axios')();
const fs = require('fs');
const get = require('lodash/get');
const getOctokit = require('../utils/get-octokit');
const os = require('os');
const path = require('path');
const remove = require('../utils/remove');
const semver = require('semver');
const uniqBy = require('lodash/uniqBy');

const {color} = require('listr2');

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
    agent = 'Lando',
    config = {},
    cli,
    channel = 'stable',
    debug = require('debug')('@lando/updates'),
    dir = os.tmpdir(),
    plugins = [],
  } = {}) {
    // set things
    this.agent = agent;
    this._plugins = plugins;
    this.channel = channel;
    this.cli = cli;
    this.config = config;
    this.dir = dir;
    this.debug = debug;

    // store "special" lando update metainfo here
    this.lando = undefined;
    // some state stuff
    this.hasChecked = false;
  }

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
    // NOTE: that we do not include core if its being loaded by the CLI
    const checks = this.plugins
      .filter(plugin => plugin.location !== this?.cli?.plugin)
      .map(async plugin => {
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
      const lando = new Plugin(cli.plugin);

      // update data
      lando.name = 'lando';
      lando.isCli = true;
      lando.isUpdateable = cli.packaged && !cli.source;
      lando.installPath = cli.installPath;
      lando.internalCore = cli.coreBase;
      lando.internalCoreVersion = cli.coreBaseVersion;

      // handle 3.21.0-beta18 release snafu
      if (lando.version === '3.21.0-beta18') {
        lando.spec = '@lando/cli@3.21.0-beta.18';
        lando.version = '3.21.0-beta.18';
        lando.pjson.version = '3.21.0-beta.18';
      }

      checks.push((async () => {
        try {
          // assess whether core has an update
          await lando.check4Update();

          // if no update then just return quickly
          if (!lando.updateAvailable) return lando;

          // otherwise we need to match an update to a link we can check
          const arch = ['arm64', 'aarch64'].includes(process.arch) ? 'arm64' : 'x64';
          const ext = process.platform === 'win32' ? '.exe' : '';
          const os = getOS();
          const version = `v${lando.update.version}`;
          const url = `https://github.com/lando/core/releases/download/${version}/lando-${os}-${arch}-${version}${ext}`;
          this.debug(`${color.dim('lando')} update resolved cli download url to  %o`, url);

          // now see whether that link is good
          const {status, statusText} = await axios.head(url, {validateStatus: () => true});

          // if we are good set the update URL
          if (status === 200) {
            this.lando = lando;
            this.lando.update.url = url;

          // if we are NOT good then the update is not available
          } else lando.updateAvailable = false;

          // also log
          this.debug(`${color.dim('lando')} download url %o returned %o %o`, url, status, statusText);

          return lando;
        } catch (error) {
          if (error.status) error.message = `${error.message} [${error.status}]`;
          if (error.response && error.response.url) error.message = `${error.message} (${error.response.url})`;
          this.debug(`${color.dim('lando')} could not get update info, error: %o`, error.message);
          this.debug('%j', error);
          lando.isUpdateable = false;
          lando.updateAvailable = false;
          lando.update = {error};
          return lando;
        }
      })());
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
    if (this?.lando?.update?.url) {
      // get stuff
      const {installPath, update} = this.lando;
      const {url, version} = update;

      tasks.push(require('../utils/parse-setup-task')({
        title: `Updating lando to v${version}`,
        description: 'lando',
        canInstall: async () => {
          // check if user can write to install path
          try {
            fs.accessSync(installPath, fs.constants.W_OK);
          } catch {
            throw new Error(`Lando cannot write to ${installPath}!`);
          }

          // throw error if we cannot ping the download link
          await axios.head(url);

          // or true
          return true;
        },
        task: async (ctx, task) => new Promise((resolve, reject) => {
          const cacheDir = require('../utils/get-cache-dir')('lando');
          const filename = process.platform === 'win32' ? 'lando.exe' : 'lando';
          const dest = path.join(cacheDir, `v${version}`, 'bin', filename);
          // @TODO: restore test when we cut 3.22?
          const download = require('../utils/download-x')(url, {debug: this.debug, dest}); // test: ['version']});

          // success
          download.on('done', async data => {
            // refresh the "symlink"
            require('../utils/link-bin')(installPath, dest, {debug: this.debug});

            // set a good default update messag
            task.title = `Updated lando to ${version}`;

            // if lando.exe exists on windows in the install path then remove it so the link has primacy
            // in PATHEXT hierarchy
            if (process.platform === 'win32' && fs.existsSync(path.join(installPath, filename))) {
              remove(path.join(installPath, filename));
            }

            // also remove lando/@core if it exists in the plugins directory
            if (fs.existsSync(path.join(this.dir, '@lando', 'core'))) {
              remove(path.join(this.dir, '@lando', 'core'));
            }

            // if link is not in PATH then attempt to add it
            // @NOTE: feels sufficient to just check for `lando` since it _should_ exist in win and posix
            if (!require('../utils/is-in-path')(path.join(installPath, 'lando'))) {
              const binPaths = require('../utils/get-bin-paths')(this.lando);
              const shellEnv = require('../utils/get-shellenv')(binPaths);

              // special handling for cmd.exe
              if (require('../utils/get-user-shell')() === 'cmd.exe') {
                const args = require('string-argv')(shellEnv.map(line => line[0]).join(' && '));
                const opts = {debug: this.debug, ignoreReturnCode: true};
                const result = require('is-root')()
                  ? await require('../utils/run-elevated')(args, opts)
                  : await require('../utils/run-command')(args[0], args.slice(1), opts);
                this.debug('path adding command %o executed with result %o', args, result);

              // otherwise check for RCfile
              } else if (require('../utils/get-shell-profile')() !== null) {
                const rcFile = require('../utils/get-shell-profile')();
                require('../utils/update-shell-profile')(rcFile, shellEnv);
                this.debug('added %o to %o', shellEnv, rcFile);
                task.title = `${task.title}. Start a new terminal session to use the updated ${color.bold(`lando`)}`;

              // otherwis i guess do something else?
              // @TODO: throw a warning?
              } else this.debug('could not add %o to PATH!', binPaths);
            }

            // finish
            resolve(data);
          });
          // handle errors
          download.on('error', error => {
            reject(error);
          });
          // update title to reflect download progress
          download.on('progress', progress => {
            task.title = `Downloading lando@${version} ${color.dim(`[${progress.percentage}%]`)}`;
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
  }

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
    const octokit = getOctokit({auth: get(process, 'env.LANDO_GITHUB_TOKEN'), userAgent: this.agent});

    // get latest
    try {
      const {data} = await octokit.rest.repos.listReleases({owner: 'lando', repo: 'lando'});
      const latest = _.find(_.get(data, 'data', []), r => (r.draft === false && r.prerelease === edge));
      return parseData(latest, version);
    } catch {
      return parseData(null, version);
    }
  }

  /*
   * DEPRECATED and for backwards compatibility only
   * returns the cli version only?
   */
  updateAvailable(version1, version2) {
    return semver.lt(version1, version2);
  }
};
