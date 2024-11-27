'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const getDockerBinPath = require('../utils/get-docker-bin-path');
const os = require('os');
const path = require('path');

const Cache = require('./cache');
const Events = require('./events');
const Log = require('./logger');
const Promise = require('./promise');
const Shell = require('./shell');

const shell = new Shell();

// Constants
const MACOS_BASE = '/Applications/Docker.app';
const WSL_DOCKER = '/Docker/host/bin/docker.exe';

/*
 * Get services wrapper
 */
const buildDockerCmd = (cmd, scriptsDir, dockerBin) => {
  const windowsStartScript = path.join(scriptsDir, 'docker-desktop-start.ps1');
  switch (process.landoPlatform ?? process.platform) {
    case 'darwin':
      return ['open', MACOS_BASE];
    case 'linux':
      return [path.join(scriptsDir, `docker-engine-${cmd}.sh`)];
    case 'win32':
    case 'wsl':
      return ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', `"${windowsStartScript}"`];
  }
};

/*
 * Helper to build mac docker version get command
 */
const getMacProp = prop => shell.sh(['defaults', 'read', `${MACOS_BASE}/Contents/Info.plist`, prop])
  .then(data => _.trim(data))
  .catch(() => null);

/*
 * Creates a new Daemon instance.
 */
module.exports = class LandoDaemon {
  constructor(
      cache = new Cache(),
      events = new Events(),
      docker = require('../utils/get-docker-x')(),
      log = new Log(),
      context = 'node',
      compose = require('../utils/get-compose-x')(),
      orchestratorVersion = '2.30.3',
      userConfRoot = path.join(os.homedir(), '.lando'),
  ) {
    this.cache = cache;
    this.compose = compose;
    this.debug = require('../utils/debug-shim')(log);
    this.orchestratorVersion = orchestratorVersion;
    this.context = context;
    this.docker = docker;
    this.events = events;
    this.log = log;
    this.scriptsDir = path.join(userConfRoot, 'scripts');
    this.isRunning = false;
    this.platform = process.landoPlatform ?? process.platform;
  };

  /*
   * Tries to active the docker engine/daemon.
   *
   * @since 3.0.0
   * @fires pre_engine_up
   * @fires post_engine_up
   * @return {Promise} A Promise.
   */
  up(retry = true, password) {
    const debug = require('../utils/debug-shim')(this.log);

    // backwards compat
    if (retry === true) retry = {max: 25, backoff: 1000};
    else if (retry === false) retry = {max: 0};

    /*
     * Not officially documented event that allows you to do some things before
     * the docker engine is booted up.
     *
     * @since 3.0.0
     * @event pre_engine_up
     */
    return this.events.emit('pre-engine-up').then(() => {
      // Automatically return true if we are in the GUI and on linux because
      // this requires SUDO and because the daemon should always be running on nix
      if (this.context !== 'node' && this.platform === 'linux') return Promise.resolve(true);

      // retry func
      const starter = async () => {
        return await this.isUp().then(async isUp => {
          if (isUp) return Promise.resolve();

          try {
            switch (this.platform) {
              case 'darwin':
                await require('../utils/run-command')('open', [MACOS_BASE], {debug: this.debug});
                break;
              case 'linux':
                const lscript = path.join(this.scriptsDir, 'docker-engine-start.sh');
                if (password) await require('../utils/run-elevated')([lscript], {debug, password});
                else await require('../utils/run-command')(lscript, {debug});
                break;
              case 'win32':
              case 'wsl':
                const wscript = path.join(this.scriptsDir, 'docker-desktop-start.ps1');
                await require('../utils/run-powershell-script')([wscript], undefined, {debug: this.debug});
                await require('delay')(2000);
                break;
            }

            this.debug('build engine started but waiting to connect...');
            return Promise.reject();
          } catch (error) {
            this.debug('could not start build engine with %o', error?.message);
            this.debug('%j', error);
            return Promise.reject(error);
          }
        });
      };

      return Promise.retry(starter, retry);
    })

    /*
     * Not officially documented event that allows you to do some things after
     * the docker engine is booted up.
     *
     * @since 3.0.0
     * @event post_engine_up
     */
    .then(() => this.events.emit('post-engine-up'));
  };

  down() {
    /*
     * Event that allows you to do some things after the docker engine is booted
     * up.
     *
     * @since 3.0.0
     * @event pre_engine_down
     */
    return this.events.emit('pre-engine-down')
    .then(() => {
      // Automatically return true if we are in browsery context and on linux because
      // this requires SUDO and because the daemon should always be running on nix
      if (this.context !== 'node' && this.platform === 'linux') return Promise.resolve(true);

      // Automatically return if we are on Windows or Darwin because we don't
      // ever want to automatically turn the VM off since users might be using
      // D4M/W for other things.
      //
      // For now we will be shutting down any services via relevant event hooks
      // that bind to critical/common ports on 127.0.0.1/localhost e.g. 80/443/53
      //
      // @todo: When/if we can run our own isolated docker daemon we can change
      // this back.
      if (this.platform === 'darwin' || this.platform === 'win32' || this.platform === 'wsl') {
        return Promise.resolve(true);
      }

      // Shut provider down if its status is running.
      return this.isUp(this.log, this.cache, this.docker).then(isUp => {
        if (isUp) return shell.sh(buildDockerCmd('stop', this.scriptsDir, this.docker), {mode: 'collect'});
      })

      // Wrap errors.
      .catch(err => {
        throw new Error(err, 'Error while shutting down.');
      });
    })
    /*
     * Event that allows you to do some things after the docker engine is booted
     * up.
     *
     * @since 3.0.0
     * @event post_engine_down
     */
    .then(() => this.events.emit('post-engine-down'));
  }

  /*
   * Helper to determine up and down
   * NOTE: we now assume that docker has been installed by this point
   * this means we also assume whatever necessary installation checks have been
   * performed and dockers existence verified
   */
  async isUp(log = this.log, cache = this.cache, docker = this.docker) {
    // Auto return if cached and true
    if (cache.get('engineup') === true) return Promise.resolve(true);

    // on wsl lets rework docker to avoid perm issues on the socket?
    if (this.platform === 'wsl' && fs.existsSync(WSL_DOCKER) ) docker = WSL_DOCKER;

    // Return true if we get a zero response and cache the result
    try {
      await require('../utils/run-command')(docker, ['ps'], {debug: this.debug});
      this.debug('engine is up.');
      cache.set('engineup', true, {ttl: 5});
      this.isRunning = true;
      return Promise.resolve(true);
    } catch (error) {
      this.debug('engine is down with error %s', error.message);
      return Promise.resolve(false);
    }
  };

  /*
   * Helper to get the versions of the things we need
   */
  async getVersions() {
    // presumably if we get this far orchestratorVersion is set and orchestratorBin exists
    const versions = {compose: this.orchestratorVersion, desktop: false, engine: false};
    // try to get either the desktop or engine
    switch (this.platform) {
      case 'darwin':
        return getMacProp('CFBundleShortVersionString').then(version => ({...versions, desktop: version}));
      case 'linux':
        const cmd = [`"${this.docker}"`, 'version', '--format', '{{.Server.Version}}'];
        return shell.sh(cmd).catch(() => '18.0.0').then(version => ({...versions, engine: version}));
      case 'win32':
      case 'wsl':
        const componentsVersionFile = this.platform === 'win32'
          ? path.resolve(getDockerBinPath('win32'), '..', 'componentsVersion.json') : '/Docker/host/componentsVersion.json';

        // if cvf doesnt exist then just set it to something high and dont worry about it?
        if (!fs.existsSync(componentsVersionFile)) {
          versions.desktop = 'skip';

        // If we found one, use it but allow for a fallback in case these keys change
        } else {
          const {appVersion, Version, Informational} = require(componentsVersionFile);
          versions.desktop = appVersion ?? Version ?? Informational;
        }

        return Promise.resolve(versions);
    }
  };
};
