'use strict';

const fs = require('fs-extra');
const has = require('lodash/has');
const isClass = require('is-class');
const makeError = require('../utils/make-error');
const merge = require('../utils/merge');
const os = require('os');
const path = require('path');
const parsePkgName = require('../utils/parse-package-name');
const read = require('../utils/read-file');
const semver = require('semver');
const write = require('../utils/write-file');

const {nanoid} = require('nanoid');
const {extract, manifest, packument} = require('pacote');

/**
 *
 */
class Plugin {
  // @TODO: in v4 auth/scope will be set in lando config at plugins.scope/plugins.auth
  // @TODO: ^ some hook can set these with npmrc/yarnrc files?
  // @TODO: we need to add some masking to auth stuff ^ in lando config get
  static config = {};
  static id = 'plugin';
  static debug = require('debug')('@lando/core:plugin');

  /*
   * fetches a plugin from a registry/git repo
   */
  static async fetch(plugin, {
    dest = os.tmpdir(),
    installer = Plugin.installer,
    config = Plugin.config,
    type = 'app',
  } = {}) {
    // parse the package name
    const pkg = parsePkgName(plugin);

    // get the info so we can determine whether this is a lando package or not
    try {
      const info = await Plugin.info(pkg.raw, {config});

      // update dest with name and compute the package.json location
      dest = path.join(dest, info.name);
      const pjson = path.join(dest, 'package.json');

      // make sure we have a place to extract the plugin
      const tmp = path.join(os.tmpdir(), nanoid());
      fs.mkdirSync(tmp, {recursive: true});

      // try to extract the plugin
      const {resolved} = await extract(pkg.raw, tmp, merge({Arborist: require('@npmcli/arborist')}, [config]));
      Plugin.debug('extracted plugin %o to %o from %o using %o', info._id, tmp, resolved, config);

      // if we get this far then we can safely move the plugin to dest
      fs.rmSync(dest, {recursive: true, force: true});
      fs.mkdirSync(dest, {recursive: true});
      fs.copySync(tmp, dest);
      Plugin.debug('moved plugin from %o to %o', tmp, dest);

      // rewrite package.json so it includes relevant dist stuff from info, this is relevant for updating purposes
      if (fs.existsSync(pjson)) {
        write(pjson, merge(info, require(pjson)));
        Plugin.debug('modified %o to include distribution info', pjson);
      }

      // return instantiated plugin
      return new Plugin(dest, {installer, type});

    // handle errors
    } catch (error) {
      // local plugin does not seem to exist
      if (error.code === 'ENOENT') error.message = `there does not seem to be a plugin at ${path.dirname(error.path)}`;
      // other errors
      throw error;
    }
  }

  /*
   *
   * TBD
   */
  static async info(plugin, {
    config = Plugin.config,
  } = {}) {
    // parse the plugin name
    const pkg = parsePkgName(plugin);

    // try to get info about the package
    try {
      const info = await manifest(pkg.raw, merge({}, [config, {fullMetadata: true, preferOnline: true}]));
      Plugin.debug('retrieved plugin information for %o from %o using %o', pkg.raw, info._resolved, config);

      // if not a "lando plugin" then throw an error
      if (!Plugin.isValid(info)) {
        const error = new Error(`${pkg.raw} does not seem to be a valid plugin!`);
        error.ref = 'docs to plugin requirements dev page';
        error.suggestions = ['tbd'];
        throw error;
      }

      return info;

    // handle errors
    } catch (error) {
      // @TODO: other errors?
      // local path that does not exist?
      // auth failure?
      // debug the original error
      Plugin.debug('%s', error.message);
      Plugin.debug('%j', error);
      // better 404 message
      if (error.statusCode === 404) error.message = `Could not find a plugin called ${pkg.raw} (${error.uri})`;
      // throw
      throw makeError({error});
    }
  }

  /*
   * Takes a plugin eg this or the result of Plugin.info and determines whether its a lando plugin or not
   */
  static isValid(plugin) {
    // if we are looking at a plugin instance then
    if (isClass(plugin.constructor) && plugin.constructor.name === 'Plugin') {
      return Object.keys(plugin.manifest).length > 0 ||
        has(plugin.pjson, 'lando') ||
        (plugin.pjson.keywords && plugin.pjson.keywords.includes('lando-plugin'));
    }

    // if we get here assume its info and return true for needed conditions
    // has a lando section in the package.json
    if (plugin.lando) return true;
    // has the "lando-plugin" keyword in the package.json
    if (plugin.keywords && plugin.keywords.includes('lando-plugin')) return true;

    // otherwise false
    return false;
  }

  /*
   * @TODO: scripts shoudl be moved into the engine constructor
   */
  constructor(location, {
    config = {},
    debug = Plugin.debug,
    id = Plugin.id || 'lando',
    installer = Plugin.installer,
    loadOpts = [],
    type = 'app',
    version = undefined,
  } = {}) {
    // core props
    this.root = location;
    this.enabled = true;
    this.installer = installer;
    this.type = type;

    // throw error if plugin does not seem to exist
    if (!fs.existsSync(path.join(this.root, 'package.json'))) throw new Error(`Could not find a plugin in ${this.root}`); // eslint-disable-line max-len

    // set top level things
    this.location = this.root;
    this.pjson = require(path.join(this.root, 'package.json'));

    // get the manifest
    debug.extend(this.pjson.name)('found plugin at %o', this.root);
    // get the manifest and normalize it based on root
    this.manifest = require('../utils/normalize-manifest-paths')({...this.pjson.lando, ...this.#load(...loadOpts)}, this.root); // eslint-disable-line max-len

    // if the manifest disables the plugin
    if (this.manifest.enabled === false || this.manifest.enabled === 0) this.enabled = false;

    // set some key props
    this.name = this.manifest.name || this.pjson.name;
    this.nm = path.join(this.root, 'node_modules');
    this.debug = debug.extend(this.name);
    this.package = this.pjson.name;
    this.version = this.pjson.version;

    // add auxilary info
    this.spec = `${this.name}@${this.version}`;
    this.scope = require('npm-package-arg')(this.spec).scope;

    // extract the plugin config from teh manifest and merge in any user injected config
    this.api = this.manifest.api || 4;
    this.cspace = this.manifest.cspace || this.name;
    this.config = merge({}, [this.manifest.config, config[this.cspace]]);
    this.core = this.manifest.core === true || false;

    // if we dont have a version at this point lets traverse up and see if we can find a parent
    if (!this.version) {
      // get the list of potential parents
      const ppsjons = require('../utils/traverse-up')(['package.json'], path.resolve(this.root, '..'));
      // remove the root
      ppsjons.pop();
      // paternity test
      const pjsons = ppsjons.filter(pjson => fs.existsSync(pjson));
      // if we have parents then use the closest
      if (pjsons.length > 0) this.version = require(pjsons[0]).version;
    }

    // add some computed properties
    // @NOTE: do we need a stronger check for isupdateable?
    this.isInstalled = false;
    this.isUpdateable = has(this, 'pjson.dist');
    this.isValid = Plugin.isValid(this);

    // if the plugin does not have any dependencies then consider it installed
    if (!this.pjson.dependencies || Object.keys(this.pjson.dependencies).length === 0) {
      this.isInstalled = true;
    }

    // if plugin has a non-empty node_modules folder then consider it installed
    // @NOTE: is this good enough?
    if (fs.existsSync(this.nm) && fs.readdirSync(this.nm).length > 0) {
      this.isInstalled = true;
    }

    // log result
    const status = {enabled: this.enabled, valid: this.isValid, installed: this.isInstalled};
    this.debug('instantiated plugin with status %o', status);
  }

  // Internal method to help load config
  // @TODO: we might want to put more stuff in here at some point.
  // @NOTE: this will differ from "init" which should require in all needed files?
  // @TODO: we might want to replace this with Config?
  // @TODO: how will plugin config merge with the global/app config?
  #load(config) {
    // return the plugin.js return first
    if (fs.existsSync(path.join(this.root, 'plugin.js'))) return require(path.join(this.root, 'plugin.js'))(config);
    // otherwise return the plugin.yaml content
    if (fs.existsSync(path.join(this.root, 'plugin.yaml'))) return read(path.join(this.root, 'plugin.yaml'));
    // otherwise return the plugin.yml content
    if (fs.existsSync(path.join(this.root, 'plugin.yml'))) return read(path.join(this.root, 'plugin.yml'));
    // otherwise return uh, nothing?
    return {};
  }

  async hasUpdate(channel = 'stable') {
    // normalize channel
    channel = channel === 'stable' ? 'latest' : 'latest';

    try {
      // get release data
      const data = await packument(this.spec, {fullMetadata: true});
      // build a list of highest available versions
      const havs = [data['dist-tags'].latest];
      // if we are looking at a non-standard channel then include that tag as well
      if (channel !== 'stable') havs.push(data['dist-tags'][channel]);
      // select the highest version
      const hv = semver.rsort(havs)[0];

      // if the hv is lte to what we have then no update is available
      if (semver.lte(hv, this.version)) {
        this.debug('no update available on the %o channel, %o <= %o', channel, hv, this.version);
        return false;

      // otherwise update is available
      } else {
        this.debug('update available on the %o channel, %o <= %o, ', channel, hv, this.version);
        return true;
      }

    // catch
    // @TODO: what do we actually want to do here?
    } catch (error) {
      // better 404 message
      if (error.statusCode === 404) error.message = `Could not find a plugin called ${pkg.raw}`;
      // throw
      throw makeError({error});
    }
  }

  /*
   * We get the data from this.location when calling info on the instance because *presumably* this should be best
   * across different package types
   */
  async info() {
    const info = await manifest(this.location, {fullMetadata: true});
    this.debug('retrieved plugin information for %o from %o', this.spec, info._resolved);
    return info;
  }

  /**
   * Install a plugin.
   * ideally we do not have to do this because the pacakge is fully contained in the tarball
   */
  async install({installer = this.installer || Plugin.installer} = {}) {
    // try teh install
    await installer.installPlugin(this.root, this.config.installer);
    // if we get here then we can update isInstalled
    this.isInstalled = true;
  }

  /*
   * Remove a plugin.
   */
  remove() {
    this.debug('removed %o from %o', this.spec, this.location);
    return fs.rmSync(this.root, {recursive: true, force: true});
  }

  /*
   * updates a plugin.
   */
  // async update(channel = 'stable') {
  // // normalize channel
  //   channel = channel === 'stable' ? 'latest' : 'latest';

  //   try {
  //     // get release data
  //     const data = await packument(this.spec, {fullMetadata: true});
  //     // build a list of highest available versions
  //     const havs = [data['dist-tags'].latest];
  //     // if we are looking at a non-standard channel then include that tag as well
  //     if (channel !== 'stable') havs.push(data['dist-tags'][channel]);
  //     // extract the highest version
  //     const hv = semver.rsort(havs)[0];
  //     // @TODO: calculate the destination?


  //   // catch
  //   // @TODO: what do we actually want to do here?
  //   } catch (error) {
  //     // better 404 message
  //     if (error.statusCode === 404) error.message = `Could not find a plugin called ${pkg.raw}`;
  //     // throw
  //     throw makeError({error});
  //   }
  // }
}

module.exports = Plugin;
