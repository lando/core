'use strict';

// Modules
const _ = require('lodash');
const Cache = require('./cache');
const Events = require('./events');
const Log = require('./logger');
const path = require('path');
const Promise = require('./promise');
const Shell = require('./shell');
const shell = new Shell();

// Constants
const macOSBase = '/Applications/Docker.app';

/*
 * Get services wrapper
 */
const buildDockerCmd = cmd => {
  switch (process.platform) {
    case 'darwin':
      return ['open', macOSBase];
    case 'linux':
      return ['sudo', 'service', 'docker'].concat(cmd);
    case 'win32':
      const base = process.env.ProgramW6432 || process.env.ProgramFiles;
      const dockerBin = base + '\\Docker\\Docker\\Docker Desktop.exe';
      return ['cmd', '/C', `"${dockerBin}"`];
  }
};

/*
 * Helper to build mac docker version get command
 */
const getMacProp = prop => shell.sh(['defaults', 'read', `${macOSBase}/Contents/Info.plist`, prop])
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
      orchestratorVersion = '1.29.2',
  ) {
    this.cache = cache;
    this.compose = compose;
    this.orchestratorVersion = orchestratorVersion;
    this.context = context;
    this.docker = docker;
    this.events = events;
    this.log = log;
  };

  /*
   * Tries to active the docker engine/daemon.
   *
   * @since 3.0.0
   * @fires pre_engine_up
   * @fires post_engine_up
   * @return {Promise} A Promise.
   */
  up() {
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
      if (this.context !== 'node' && process.platform === 'linux') return Promise.resolve(true);
      // Turn it on if we can
      return this.isUp().then(isUp => {
        if (!isUp) {
          const retryOpts = {max: 25, backoff: 1000};
          return shell.sh(buildDockerCmd('start'))
          .catch(err => {
            throw Error('Could not automatically start the Docker Daemon. Please manually start it to continue.');
          })
          // Likely need to retry until start command completes all good
          .retry(() => this.isUp().then(isUp => (!isUp) ? Promise.reject() : Promise.resolve()), retryOpts)
          // Fail if retry is no good
          .catch(err => {
            throw Error('Could not automatically start the Docker Daemon. Please manually start it to continue.');
          })
          // Engine is good!
          .then(() => this.log.info('engine activated.'));
        }
      });
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
      if (this.context !== 'node' && process.platform === 'linux') return Promise.resolve(true);
      // Automatically return if we are on Windows or Darwin because we don't
      // ever want to automatically turn the VM off since users might be using
      // D4M/W for other things.
      //
      // For now we will be shutting down any services via relevant event hooks
      // that bind to critical/common ports on 127.0.0.1/localhost e.g. 80/443/53
      //
      // @todo: When/if we can run our own isolated docker daemon we can change
      // this back.
      if (process.platform === 'win32' || process.platform === 'darwin') return Promise.resolve(true);
      // Shut provider down if its status is running.
      return this.isUp(this.log, this.cache, this.docker).then(isUp => {
        if (isUp) return shell.sh(buildDockerCmd('stop'), {mode: 'collect'});
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
  isUp(log = this.log, cache = this.cache, docker = this.docker) {
    // Auto return if cached and true
    if (cache.get('engineup') === true) return Promise.resolve(true);
    // Return true if we get a zero response and cache the result
    return shell.sh([`"${docker}"`, 'info']).then(() => {
      log.debug('engine is up.');
      cache.set('engineup', true, {ttl: 5});
      return Promise.resolve(true);
    })
    .catch(error => {
      log.debug('engine is down with error', error);
      return Promise.resolve(false);
    });
  };

  /*
   * Helper to get the versions of the things we need
   */
  getVersions() {
    // presumably if we get this far orchestratorVersion is set and orchestratorBin exists
    const versions = {compose: this.orchestratorVersion, desktop: false, engine: false};
    // try to get either the desktop or engine
    switch (process.platform) {
      case 'darwin':
        return getMacProp('CFBundleShortVersionString').then(version => ({...versions, desktop: version}));
      case 'linux':
        const cmd = [`"${this.docker}"`, 'version', '--format', '{{.Server.Version}}'];
        return shell.sh(cmd).catch(() => '18.0.0').then(version => ({...versions, engine: version}));
      case 'win32':
        const componentsVersionFile = path.resolve(env.getDockerBinPath(), '..', 'componentsVersion.json');
        // If we found one, use it but allow for a fallback in case these keys change
        if (componentsVersionFile) {
          // There are two different keys that map to the docker desktip version depending on the version
          versions.desktop = _.get(require(componentsVersionFile), 'Informational', '4.0.0');
          versions.desktop = _.get(require(componentsVersionFile), 'Version', '4.0.0');
        }
        return Promise.resolve(versions);
    }
  };
};
