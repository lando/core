'use strict';

const fs = require('fs-extra');
const has = require('lodash/has');
const isClass = require('is-class');
const makeError = require('../utils/make-error');
const merge = require('../utils/merge');
const os = require('os');
const path = require('path');
const parsePkgName = require('../utils/parse-package-name');
const purgeDep = require('../utils/purge-node-dep');
const read = require('../utils/read-file');
const remove = require('../utils/remove');
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
  static channel = 'stable';
  static id = 'plugin';
  static debug = require('debug')('@lando/core:plugin');

  static fetchConfig = {
    namespace: 'auto',
    excludeDeps: [],
  };

  /*
   * fetches a plugin from a registry/git repo
   */
  static async fetch(plugin, {
    dest = os.tmpdir(),
    config = Plugin.config,
    excludes = Plugin.fetchConfig.excludeDeps,
    installer = Plugin.installer,
    type = 'app',
  } = {}) {
    // parse the package name
    const pkg = parsePkgName(plugin);

    // get the info so we can determine whether this is a lando package or not
    try {
      const info = await Plugin.info(pkg.raw, {config});

      // update dest with name and compute the package.json location
      dest = path.join(dest, Plugin.getLocation(info.name) ?? info[Plugin.fetchConfig.namespace]);
      const pjson = path.join(dest, 'package.json');

      // make sure we have a place to extract the plugin
      const tmp = path.join(os.tmpdir(), nanoid());
      fs.mkdirSync(tmp, {recursive: true});

      // try to extract the plugin
      const {resolved} = await extract(pkg.raw, tmp, merge({Arborist: require('@npmcli/arborist')}, [config]));
      Plugin.debug('extracted plugin %o to %o from %o using %o %o', info._id, tmp, resolved, config);

      // remove excludes
      for (const exclude of excludes) {
        purgeDep(tmp, exclude);
        Plugin.debug('purged dependency %o from %o', exclude, tmp);
      }

      // if we get this far then we can safely move the plugin to dest
      remove(dest);
      fs.mkdirSync(dest, {recursive: true});
      fs.copySync(tmp, dest, {overwrite: true});
      Plugin.debug('moved plugin from %o to %o', tmp, dest);

      // rewrite package.json so it includes relevant dist stuff from info, this is relevant for updating purposes
      if (fs.existsSync(pjson)) {
        write(pjson, merge(info, [{ignoreDependencies: excludes}, read(pjson)]));
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
   * Helper to return where a plugin should live relative to the install dir
   */
  static getLocation(plugin) {
    const parsed = parsePkgName(plugin);

    // basically @lando get "name" and everything else gets "package"
    if (Plugin.fetchConfig.namespace === 'auto') {
      if (parsed.scope === '@lando') return parsed['name'];
      else return parsed['package'];
    }

    return parsed[Plugin.fetchConfig.namespace];
  }

  /*
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
    channel = Plugin.channel,
    config = {},
    commit,
    debug = Plugin.debug,
    id = Plugin.id ?? 'lando',
    installer = Plugin.installer,
    loadOpts = [],
    type = 'app',
    version = undefined,
  } = {}) {
    // core props
    this.root = location;
    this.channel = channel;
    this.enabled = true;
    this.installer = installer;
    this.type = type;
    this.legacyPlugin = false;
    this.id = id;

    // if there isnt a package.json we have a more complicated situation
    if (!fs.existsSync(path.join(this.root, 'package.json'))) {
      // if there is an index.js without a package.json then assume it is a legacy plugin and spoof
      // a basic package.json
      if (fs.existsSync(path.join(this.root, 'index.js'))) {
        const resolver = process.platform === 'win32' ? path.win32.resolve : path.posix.resolve;
        const dirs = resolver(path.dirname(path.join(this.root, 'index.js'))).split(path.sep);
        this.pjson = {name: dirs[dirs.length - 1], lando: {legacy: true}};
        this.legacyPlugin = true;

      // otherwise throw an error that this is just not a plugin
      } else throw new Error(`Could not find a plugin in ${this.root}`);

    // read package.json
    } else this.pjson = read(path.join(this.root, 'package.json'));

    // set top level things
    this.location = this.root;
    this.sourceRoot = this.root;

    // get the manifest
    debug.extend(this.pjson.name)('found %o at %o', this.legacyPlugin ? 'legacy plugin' : 'plugin', this.root);
    // get the manifest and normalize it based on root
    this.manifest = require('../utils/normalize-manifest-paths')({...this.pjson.lando, ...this.#load(...loadOpts)}, this.root); // eslint-disable-line max-len

    // if the manifest disables the plugin
    if (this.manifest.enabled === false || this.manifest.enabled === 0) this.enabled = false;

    // set some key props
    this.name = this.manifest.name || this.pjson.name;
    this.nm = path.join(this.root, 'node_modules');
    this.debug = debug.extend(this.name);
    this.package = this.pjson.name;
    this.version = version ?? this.pjson.version;

    // extract the plugin config from teh manifest and merge in any user injected config
    this.api = this.manifest.api ?? 4;
    this.cspace = this.manifest.cspace ?? this.name;
    this.core = this.manifest.core === true || false;

    // @NOTE: do we still want to do this?
    this.config = merge({}, [this.manifest.config, config[this.cspace]]);

    // if we dont have a version at this point lets traverse up and see if we can find a parent
    if (!this.version) {
      // get the list of potential parents
      const ppsjons = require('../utils/traverse-up')(['package.json'], path.resolve(this.root, '..'));
      // remove the root
      ppsjons.pop();
      // paternity test
      const pjsons = ppsjons.filter(pjson => fs.existsSync(pjson));

      // if we have parents then use the closest and also reset some package considerations for updating
      if (pjsons.length > 0) {
        this.parent = require(pjsons[0]);
        this.sourceRoot = path.dirname(pjsons[0]);
        this.version = this.parent.version;
        this.package = this.parent.name;
        this.nested = true;
      }
    }

    // add auxilary package info
    this.spec = `${this.package}@${this.version}`;
    this.scope = require('npm-package-arg')(this.spec).scope;
    if (this.scope) this.unscoped = this.package.replace(`${this.scope}/`, '');

    // add some computed properties
    // @NOTE: do we need a stronger check for isupdateable?
    this.isInstalled = false;
    this.isUpdateable = this.manifest['is-updateable'] || has(this.parent, 'dist') || has(this, 'pjson.dist');
    this.isValid = Plugin.isValid(this);
    this.updateAvailable = false;

    // determine some packaging stuff
    this.packaged = has(this.parent, 'pjson.dist') || has(this, 'pjson.dist');
    this.source = fs.existsSync(path.join(this.sourceRoot, '.git', 'HEAD'));
    this.commit = commit ?? this.source ? require('../utils/get-commit-hash')(this.sourceRoot, {short: true}) : false;
    // append commit to version if from source
    if (this.source && this.commit) this.version = `${this.version}-0-${this.commit}`;

    // if we have ignoreDependencies then lets mutate this.pjson.dependencies for downstream considerations
    if (this.pjson.ignoreDependencies && this.pjson.dependencies) {
      for (const ignored of this.pjson?.ignoreDependencies) {
        delete this.pjson.dependencies[ignored];
      }
    }

    // if the plugin does not have any dependencies then consider it installed
    if (!this.pjson.dependencies || Object.keys(this.pjson.dependencies).length === 0) {
      this.isInstalled = true;
    }

    // if plugin has a non-empty node_modules folder then consider it installed
    // @NOTE: is this good enough?
    if (fs.existsSync(this.nm) && fs.readdirSync(this.nm).length > 0) {
      this.isInstalled = true;
    }

    // if is updateable then lets try to figure out the template string for release notes
    if (this.isUpdateable) this.rnt = this.manifest['release-notes'];
    // special release notes handling for core @lando/packages
    if (!this.rnt && this.scope === '@lando') {
      this.rnt = `https://github.com/lando/${this.unscoped}/releases/tag/v\${version}`;
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

  async check4Update() {
    // if plugin is not updateable then immediately return
    if (!this.isUpdateable) {
      this.debug('is not updateable, update manually');
      return this;
    }

    // otherwise proceed by first normalizing the channel
    const channel = this.channel === 'stable' ? 'latest' : this.channel;

    try {
      // get release data
      const data = await packument(this.spec, merge({}, [Plugin.config, {fullMetadata: true}]));
      // build a list of highest available versions
      const havs = [data['dist-tags'].latest];
      // if we are looking at a non-standard channel then include that tag as well
      if (this.channel !== 'stable') havs.push(data['dist-tags'][channel]);
      // select the highest version
      const hv = semver.rsort(havs)[0];
      const hc = data['dist-tags'].latest === hv ? 'stable' : channel;

      // if the hv is lte to what we have then no update is available
      if (require('../utils/is-lte-version')(hv, this.version)) {
        this.debug('cannot be updated on channel %o (%o <= %o)', channel, hv, this.version);
        return this;

      // otherwise update is available
      } else {
        this.updateAvailable = `${this.package}@${hv}`;
        this.update = await Plugin.info(this.updateAvailable);
        this.update.channel = hc;
        this.debug(
          'can be updated to %o on channel %o (%o > %o) ',
          hv,
          channel,
          hv,
          this.version,
        );
        return this;
      }

    // catch
    // @TODO: what do we actually want to do here?
    } catch (error) {
      // better 404 message
      if (error.statusCode === 404) error.message = `Could not find a plugin called ${this.package}`;
      // debug error
      this.debug('%o could not get update info, error: %o', this.package, error.message);
      this.debug('%j', error);
      this.isUpdateable = false;
      this.updateAvailable = false;
      this.update = {error};
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
    return remove(this.root);
  }
}

module.exports = Plugin;
