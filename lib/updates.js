'use strict';

const os = require('os');
const uniqBy = require('lodash/uniqBy');

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
    this.cli = cli;
    this.dir = dir;
    this.debug = debug;
    this.Plugin = require('../components/plugin');

    // reset Plugin static defaults for v3 purposes
    this.Plugin.channel = channel;
    this.Plugin.config = config;
    this.Plugin.debug = debug;

    // some state stuff
    this.hasChecked = false;
  };

  // translate set plugins when they are set
  set plugins(plugins) {
    this._plugins = plugins.map(plugin => new this.Plugin(plugin.dir));
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

    // @TODO: push CLI check here?

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
    const tasks = uniqBy(this.plugins, plugin => plugin.parent ? plugin.parent.name : plugin.name)
      .filter(plugin => plugin.isUpdateable)
      .filter(plugin => plugin.updateAvailable !== false)
      .map(plugin => require('../utils/get-plugin-update-task')(plugin.updateAvailable, {
        dir: this.dir,
        Plugin: this.Plugin,
      }))
      .map(task => require('../utils/parse-setup-task')(task));

    // @TODO: special handling for CLI

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
    return await this.check();
    /*
    -    // GitHub repo config
    -    const landoRepoConfig = {
    -      owner: 'lando',
    -      repo: 'lando',
    -      page: 1,
    -      per_page: 25,
    -    };
    -    // Helper to parse data
    -    const parseData = (latest, version) => ({
    -      version: _.trimStart(_.get(latest, 'tag_name', version), 'v'),
    -      url: _.get(latest, 'html_url', ''),
    -      expires: Math.floor(Date.now()) + 86400000,
    -    });
    -    // This i promise you
    -    return this.githubApi.repos.getReleases(landoRepoConfig)
    -    // Extract and return the metadata
    -    .then(data => {
    -      // Get the latest non-draft/non-prerelease version
    -      const latest = _.find(_.get(data, 'data', []), r => (r.draft === false && r.prerelease === edge));
    -      // Return the update data
    -      return parseData(latest, version);
    -    })
    -    // Don't let an error here kill things
    -    .catch(() => parseData(null, version));
    */
  };

  /*
   * DEPRECATED and for backwards compatibility only
   * returns the cli version only?
   */
  updateAvailable(version1, version2) {
    return require('semver').lt(version1, version2);
  };
};
