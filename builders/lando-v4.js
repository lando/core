'use strict';

const fs = require('fs');
const isObject = require('lodash/isPlainObject');
const merge = require('lodash/merge');
const path = require('path');
const uniq = require('lodash/uniq');
const write = require('../utils/write-file');
const toPosixPath = require('../utils/to-posix-path');

const LandoError = require('../components/error');

const {nanoid} = require('nanoid');

const states = {APP: 'UNBUILT'};
const stages = {
  app: 'Commands to build an application.',
  workers: 'Background processes for whatever else?',
};
const groups = {
  'boot': {
    description: 'Required packages that every subsequent group needs',
    weight: 100,
    user: 'root',
  },
  'system': {
    description: 'System level packages',
    weight: 200,
    user: 'root',
  },
  'setup-user': {
    description: 'Host/container user mapping considerations',
    weight: 300,
    user: 'root',
  },
  'tooling': {
    description: 'Installation of tooling',
    weight: 400,
    user: 'root',
  },
  'storage': {
    description: 'Set ownership and permission of storage mounts',
    weight: 500,
    user: 'root',
  },
  'config': {
    description: 'Configuration file stuff',
    weight: 600,
    user: 'root',
  },
  'user-image': {
    description: 'User contributed build steps',
    weight: 900,
    user: 'root',
  },
};

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  api: 4,
  name: 'lando',
  parent: 'l337',
  defaults: {
    config: {
      'app-mount': '/app',
      'certs': true,
      'environment': {},
      'healthcheck': false,
      'hostnames': [],
      'labels': {},
      'mount': [],
      'mounts': [],
      'overrides': {},
      'packages': {
        'git': true,
        'ssh-agent': true,
        'sudo': true,
      },
      'persistent-storage': [],
      'ports': [],
      'security': {
        'ca': [],
        'certificate-authority': [],
        'cas': [],
        'certificate-authorities': [],
      },
      'storage': [],
      'volumes': [],
    },
  },
  router: () => ({}),
  builder: (parent, defaults) => class LandoServiceV4 extends parent {
    static debug = require('debug')('@lando/l337-service-v4');

    #run = {
      environment: [],
      labels: {},
      mounts: [],
    }

    #installers = {
      'certs': require('../packages/certs/certs'),
      'git': require('../packages/git/git'),
      'proxy': require('../packages/proxy/proxy'),
      'security': require('../packages/security/security'),
      'sudo': require('../packages/sudo/sudo'),
      'user': require('../packages/user/user'),

      // @TODO: this is a temp implementation until we have an ssh-agent container
      'ssh-agent': require('../packages/ssh-agent/ssh-agent'),
    };

    #addRunEnvironment(data) {
      // if data is an object we need to put into array format
      if (isObject(data)) data = Object.entries(data).map(([key, value]) => `${key}=${value}`);
      // if data is an array then lets concat and uniq to #env
      if (Array.isArray(data)) this.#run.environment = uniq([...this.#run.environment, ...data]);
    }

    #addRunLabels(data = {}) {
      // if data is an array we need to put into object format
      if (Array.isArray(data)) data = Object.fromEntries(data).map(datum => datum.split('='));
      // if data is an object then we can merge to #labels
      if (isObject(data)) this.#run.labels = merge(this.#run.labels, data);
    }

    #addRunVolumes(data = []) {
      // if data is not an array then do nothing
      if (!Array.isArray(data)) return;

      // run data through normalizeVolumes first so it normalizes our mounts
      // and then munge it all 2gether
      this.#run.mounts = uniq([
        ...this.#run.mounts,
        ...this.normalizeVolumes(data).map(volume => `${volume.source}:${volume.target}`),
      ]);
    }

    #handleScriptyInput(contents, {id = undefined} = {}) {
      // @TODO: handle non-stringy inputs?
      // if its a single line string then lets not overly complicate things
      if (contents.split('\n').length === 1) return contents;
      // otherwise dump-n-mount
      return this.mountScript(contents, {dest: id});
    }

    #setupBoot() {
      this.addContext(`${path.join(__dirname, '..', 'scripts', 'lash.sh')}:/bin/lash`);
      this.addLSF(path.join(__dirname, '..', 'scripts', 'boot.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'entrypoint.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'exec.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'exec-multiliner.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'run-hooks.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'landorc.sh'), 'landorc');
      this.addLSF(path.join(__dirname, '..', 'scripts', 'utils.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'environment.sh'), 'environment');
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-updates.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-bash.sh'));
      this.addSteps({group: 'boot', instructions: `
        ENV DEBUG=1
        ENV LANDO_DEBUG=1
        ENV PATH=$PATH:/etc/lando/bin
        RUN mkdir -p /etc/lando /etc/lando/env.d /etc/lando/build/image
        RUN chmod 777 /etc/lando
        RUN ln -sf /etc/lando/environment /etc/profile.d/lando.sh
        RUN /etc/lando/boot.sh
        SHELL ["/bin/bash", "-c"]
      `});
    }

    #setupHooks() {
      // filter out early stage hooks
      const groups = this?._data?.groups ?? {};
      const hooks = Object.keys(this._data.groups)
        .filter(group => parseInt(groups?.[group]?.weight ?? 1000) > 100)
        .map(group => ([group, groups?.[group]?.user ?? 'root']));

      // add hooks for each post boot image build group
      for (const [hook, user] of hooks) {
        this.addSteps({group: hook, instructions: `
          USER root
          RUN mkdir -p /etc/lando/build/image/${hook}.d
          USER ${user}
          RUN /etc/lando/run-hooks.sh image ${hook}
        `});
      }
    }

    #setupAppMount() {
      // if appMount is a string then we need to add prepend the appRoot
      if (typeof this.appMount === 'string') this.appMount = `${this.appRoot}:${this.appMount}`;
      // if its an object we need to force the source
      if (isObject(this.appMount)) this.appMount = {...this.appMount, source: this.appRoot};

      // unshift it onto mounts
      this.mounts.unshift(...require('../utils/normalize-mounts')([this.appMount], this));

      // then normalize it so we can get the target
      this.appMount = this.normalizeVolumes([this.appMount])?.[0]?.target;
      this.workdir = this.appMount;

      // set stuff
      this.info = {appMount: this.appMount};
      this.addLandoServiceData({
        environment: {LANDO_PROJECT_MOUNT: this.appMount},
        working_dir: this.appMount,
      });
    }

    #setupMounts() {
      // start with any storage mounts so we can do it one fell swoop
      const storage = this.mounts.filter(mount => mount.type.startsWith('storage'))
        .map(storage => ({...storage, type: storage.type.split(':')[1] ?? 'volume'}));

      // normalize and pass on storage if applicable
      if (storage.length > 0) this.storage.push(...require('../utils/normalize-storage')(storage, this));

      // loop through non-storage mounts and add them
      for (const mount of this.mounts.filter(mount => !mount.type.startsWith('storage'))) {
        // as a volume
        if (mount.type === 'bind') this.volumes.push(mount);
        // or as build context
        else if (mount.type === 'copy') this.addContext(mount, mount.group);
      }
    }

    #setupStorage() {
      // add top level volumes
      this.tlvolumes = Object.fromEntries(this.storage
        .filter(volume => volume.type === 'volume')
        .map(volume => ([volume.source, {external: true}])));

      // storage volumes
      this.volumes.push(...this.storage
        .filter(volume => volume.type === 'volume' || volume.type === 'bind')
        .map(data => {
          // blow it up
          const {destination, labels, name, owner, permissions, scope, ...volume} = data; // eslint-disable-line no-unused-vars
          // return what we need
          return volume;
        }),
      );

      // set initial storage volume ownerships/perms
      for (const volume of this.storage) {
        // by default assume our dir creation is the volume target
        volume.dir = volume.target;

        // but if volume if a bind and file then BACK IT UP
        try {
          if (volume.type === 'bind' && fs.statSync(volume.source).isFile()) {
            volume.dir = path.dirname(volume.target);
          }
        } catch (error) {
          error.message = `Error bind mounting storage: ${error.message}`;
          throw error;
        }

        // recreate and chown
        this.addSteps({group: 'storage', instructions: `
          RUN rm -rf ${volume.dir} \
            && mkdir -p ${volume.dir} \
            && chown -R ${volume.owner ?? this.user.name} ${volume.dir}
        `});

        // optionally set perms
        if (volume.permissions) {
          this.addSteps({group: 'storage', instructions: `
            RUN chmod -R ${volume.permissions} ${volume.dir}
          `});
        }
      }
    }

    constructor(id, options, app, lando) {
      // @TODO: overrides for this.run()?
      // @TODO: allow additonal users to be installed in config.users?
      // @TODO: change lando literal to "lando product"
      // @TODO: debug/lando_debug should be set with env?
      // @TODO: command as a full script?

      // get stuff from config
      const {caCert, caDomain, gid, uid, username} = lando.config;
      // before we call super we need to separate things
      const {config, ...upstream} = merge({}, defaults, options);
      // consolidate user info with any incoming stuff
      const user = merge({}, {gid, uid, name: username}, require('../utils/parse-v4-user')(config.user));

      // this will change but for right now i just need the image stuff to passthrough
      upstream.config = {image: config.image, ports: config.ports};
      // make sure we also pass the user
      upstream.user = user.name;

      // add a user build group
      groups.user = {
        description: 'Catch all group for things that should be run as the user',
        weight: 2000,
        user: user.name,
      };

      // get this
      super(id, merge({}, {stages}, {groups}, {states}, upstream), app, lando);

      // props
      this.api = 4;
      this.canHealthcheck = true;
      this.isInteractive = lando.config.isInteractive;
      this.generateCert = lando.generateCert.bind(lando);
      this.network = lando.config.networkBridge;

      // upstream requirements
      this.router = upstream.router;
      this.user = user;

      // top level stuff
      this.tlnetworks = {[this.network]: {external: true}};

      // config
      this.appMount = config.appMount ?? config.appmount ?? config['app-mount'];
      this.certs = config.certs;
      this.healthcheck = config.healthcheck;
      this.hostnames = uniq([...config.hostnames, `${this.id}.${this.project}.internal`]);
      this.mounts = require('../utils/normalize-mounts')([...config.mounts, ...config.mount], this);
      this.overrides = config.overrides;
      this.packages = config.packages;
      this.security = config.security;
      this.security.cas.push(caCert, path.join(path.dirname(caCert), `${caDomain}.pem`));
      this.storage = require('../utils/normalize-storage')([...config.storage, ...config['persistent-storage']], this);
      this.volumes = config.volumes;
      this.workdir = undefined;

      // if app mount is enabled then hook that up
      if (!require('../utils/is-disabled')(this.appMount)) this.#setupAppMount();
      // if not then we need to sus out a workign directory
      else this.workdir = config?.overrides?.working_dir ?? config?.working_dir ?? '/';

      // if we have a command then also set that up
      if (!require('../utils/is-disabled')(config.command)) {
        this.command = this.#handleScriptyInput(config.command, {id: `${this.id}-command.sh`});
      }

      // ditto for entrypoint
      if (!require('../utils/is-disabled')(config.entrypoint)) {
        this.entrypoint = this.#handleScriptyInput(config.entrypoint, {id: `${this.id}-entrypoint.sh`});
      }

      // @TODO: add in tmp-storage and home-storage?

      // boot stuff
      this.#setupBoot();
      // hook system
      this.#setupHooks();
      // mounting system
      this.#setupMounts();
      // storage system
      this.#setupStorage();

      // set up some core package config
      this.packages.certs = this.certs;
      this.packages.security = this.security;
      this.packages.user = this.user;

      // if the proxy is on then set the package
      if (lando.config?.proxy === 'ON') {
        this.packages.proxy = {
          volume: `${lando.config.proxyName}_proxy_config`,
          domains: require('../packages/proxy/get-proxy-hostnames')(app?.config?.proxy?.[id] ?? []),
        };
      }

      // user app build stuff
      // @TODO: app:first, app:changed, app:every
      // @TODO: handle array content?
      // @TODO: improve this, a lot
      // @TODO: allow for file path and single line contents
      if (config?.build?.app && typeof config.build.app === 'string') {
        this.addHookFile(config?.build?.app, {stage: 'app', hook: 'user'});
      }

      // user image build stuff
      // @TODO: image:user image:root?
      // @TODO: allow for "step" objects?
      // @TODO: allow path content as well?
      if (config?.build?.image && typeof config.build.image === 'string') {
        const runner = config.build.image
          .split('\n')
          .filter(line => line && line !== '')
          .join(' && ');
        this.addSteps({group: 'user', instructions: `
          WORKDIR ${this.workdir}
          RUN ${runner}
        `});
      }

      // info things
      this.info = {hostnames: this.hostnames};

      // auth stuff
      // @TODO: make this into a package?
      this.setNPMRC(lando.config.pluginConfigFile);

      // add in top level things
      this.addComposeData({networks: this.tlnetworks, volumes: this.tlvolumes});

      // environment
      const environment = {
        DEBUG: lando.debuggy ? '1' : '',
        LANDO: 'ON',
        LANDO_DEBUG: lando.debuggy ? '1' : '',
        LANDO_HOST_IP: 'host.lando.internal',
        LANDO_HOST_GID: require('../utils/get-gid')(),
        LANDO_HOST_OS: process.platform,
        LANDO_HOST_UID: require('../utils/get-uid')(),
        LANDO_HOST_USER: require('../utils/get-username')(),
        LANDO_LEIA: lando.config.leia === false ? '0' : '1',
        LANDO_PROJECT: this.project,
        LANDO_SERVICE_API: 4,
        LANDO_SERVICE_NAME: this.id,
        LANDO_SERVICE_TYPE: this.type,
        // user overrides
        ...config.environment,
      };

      // labels
      const labels = merge({}, app.labels, {
        'dev.lando.container': 'TRUE',
        'dev.lando.id': lando.config.id,
        'dev.lando.landofiles': app.configFiles.map(file => path.basename(file)).join(','),
        'dev.lando.root': app.root,
        'dev.lando.src': app.root,
        'io.lando.http-ports': '80,443',
      }, config.labels);

      // add it all 2getha
      this.addLandoServiceData({
        environment,
        extra_hosts: ['host.lando.internal:host-gateway'],
        labels,
        logging: {driver: 'json-file', options: {'max-file': '3', 'max-size': '10m'}},
        networks: {[this.network]: {aliases: this.hostnames}},
        user: this.user.name,
        volumes: this.volumes,
      });

      // add any overrides on top
      // @NOTE: should this be addLandoServiceData?
      // @NOTE: does it make sense to have a way to override both LandoServiceData and regular ServiceData?
      this.addServiceData(config.overrides);
    }

    addHookFile(file, {id = undefined, hook = 'boot', stage = 'image', priority = '100'} = {}) {
      // hook files are assumed to be on t
      // @TODO: addLocalHookFile?


      // if file is actually script content we need to normalize and dump it first
      if (!require('valid-path')(toPosixPath(file), {simpleReturn: true})) {
        // split the file into lines
        file = file.split('\n');
        // trim any empty lines at the top
        file = file.slice(file.findIndex(line => line.length > 0));
        // now just try to make it look pretty
        const leader = file.find(line => line.length > 0).match(/^\s*/)[0].length ?? 0;
        const contents = file.map(line => line.slice(leader)).join('\n');

        // reset file to a path and make executable
        file = path.join(this.tmpdir, id ? `${priority}-${id}.sh` : `${priority}-${stage}-${hook}.sh`);
        write(file, contents, {forcePosixLineEndings: true});
        fs.chmodSync(file, '755');
      }

      // image stage should add directly to the build context
      if (stage === 'image') {
        this.addContext(
          `${file}:/etc/lando/build/image/${hook}.d/${path.basename(file)}`,
          `${hook}-1-before`,
        );

      // app context should mount into the app
      } else if (stage === 'app') {
        const volumes = [`${file}:/etc/lando/build/app/${hook}.d/${path.basename(file)}`];
        this.addLandoServiceData({volumes});
      }
    }

    addLashRC(file, {priority = '100'} = {}) {
      this.addContext(`${file}:/etc/lando/lash.d/${priority}-${path.basename(file)}`);
    }

    addPackageInstaller(id, func) {
      this.#installers[id] = func;
    }

    async addPackage(id, data = []) {
      // check if we have an package installer
      // @TODO: should this throw or just log?
      if (this.#installers[id] === undefined || typeof this.#installers[id] !== 'function') {
        throw new Error(`Could not find a package installer function for ${id}!`);
      }

      // normalize data
      if (!Array.isArray(data)) data = [data];

      // run installer
      return await this.#installers[id](this, ...data);
    }

    addLSF(source, dest, {context = 'context'} = {}) {
      // normalize file input
      source = this.normalizeFileInput(source, {dest});

      // then do the rest
      if (dest === undefined) dest = path.basename(source);
      this.addContext(`${source}:/etc/lando/${dest}`, context);
      return `/etc/lando/${dest}`;
    }

    // wrapper around addServiceData so we can also add in #run stuff
    // @TODO: remove user if its set?
    addLandoServiceData(data = {}) {
      // pass through our run considerations
      this.addLandoRunData(data);
      // and then super
      this.addServiceData(data);
    }

    addLandoRunData(data = {}) {
      this.#addRunEnvironment(data.environment);
      this.#addRunLabels(data.labels);
      this.#addRunVolumes(data.volumes);
    }

    // buildapp
    async buildApp() {
      // create storage if needed
      // @TODO: should this be in try block below?
      if (this.storage.filter(volume => volume.type === 'volume').length > 0) {
        // get existing volumes
        const estorage = (await this.getStorageVolumes()).map(volume => volume.id);

        // find any service level volumes we might need to create
        // @TODO: note that app/project/global storage is created at the app level and not here
        const cstorage = this.storage
          .filter(volume => volume.type === 'volume')
          .filter(volume => !estorage.includes(volume.id))
          .filter(volume => volume.scope === 'service')
          .filter(volume => volume?.labels?.['dev.lando.storage-volume'] === 'TRUE');

        await Promise.all(cstorage.map(async volume => {
          const bengine = this.getBengine();
          await bengine.createVolume({Name: volume.source, Labels: volume.labels});
          this.debug('created service storage volume %o with metadata %o', volume.id, volume.labels);
        }));
      }

      // build app
      try {
        // set state
        this.info = {state: {APP: 'BUILDING'}};
        // run internal root app build first
        await this.runHook(['app', 'internal-root'], {attach: false, user: 'root'});
        // Run user app build.
        await this.runHook(['app', 'user']);
        // state
        this.info = {state: {APP: 'BUILT'}};
        // log
        this.debug('app %o built successfully', `${this.project}-${this.id}`);
        // @TODO: return something?

      // failure
      } catch (error) {
        // augment error
        error.id = this.id;
        // log
        this.debug('app %o build failed with code %o error %o', `${this.project}-${this.id}`, error.code, error);
        // set the build failure
        this.info = {state: {APP: 'BUILD FAILURE'}};
        // then throw
        throw error;
      }
    }

    async buildImage() {
      // go through all packages and install them
      await this.installPackages();

      // build the image
      const image = await super.buildImage();

      // get info props
      const {info} = image;
      const {Config, ContainerConfig} = info;

      // if command is falsy then attempt to set from image
      // @NOTE: should we have a failback "stay up" command here eg sleep infinity?
      if (!this.command) this.command = Config?.Cmd ?? ContainerConfig?.Cmd;

      // ditto for entrypoint
      if (!this.entrypoint) this.entrypoint = Config?.Entrypoint ?? ContainerConfig?.Entrypoint;

      // final check that the command is set
      if (!this.command || this.command === undefined || this.command === null || this.command === '') {
        throw new LandoError(`${this.id} has no command set!`, {context: this});
      }

      // parse command
      const parseCommand = command => {
        if (!command) return [];
        return typeof command === 'string' ? require('string-argv')(command) : command;
      };

      // add command wrapper to image
      this.addLandoServiceData({
        entrypoint: ['/etc/lando/entrypoint.sh'],
        command: [...parseCommand(this.entrypoint), ...parseCommand(this.command)],
      });

      // return
      return image;
    }

    // remove other app things after a destroy
    async destroy() {
      // remove storage if needed
      if (this.storage.filter(volume => volume.type === 'volume').length > 0) {
        const bengine = this.getBengine();
        // we want to have each service remove the mounts it created
        const volumes = (await this.getStorageVolumes())
          .filter(volume => volume.project === this.project)
          .filter(volume => volume.service === this.id)
          .filter(volume => volume.scope !== 'global')
          .map(volume => bengine.getVolume(volume.id));

        // and then trash them
        await Promise.all(volumes.map(async volume => {
          await volume.remove({force: true});
          this.debug('removed %o volume %o', this.project, volume.id);
        }));
      }

      // pass it up
      await super.destroy();
    }

    getBengine() {
      return LandoServiceV4.getBengine(LandoServiceV4.bengineConfig, {
        builder: LandoServiceV4.builder,
        debug: this.debug,
        orchestrator: LandoServiceV4.orchestrator,
      });
    }

    async getStorageVolumes() {
      const bengine = this.getBengine();

      // get the right volumes
      const {Volumes} = await bengine.listVolumes();

      // return
      return Volumes
        .filter(volume => volume?.Labels?.['dev.lando.storage-volume'] === 'TRUE')
        .map(volume => ({
          id: volume.Name,
          project: volume?.Labels?.['dev.lando.storage-project'],
          scope: volume?.Labels?.['dev.lando.storage-scope'] ?? 'service',
          service: volume?.Labels?.['dev.lando.storage-service'],
          source: volume.Name,
        }));
    }

    async installPackages() {
      await Promise.all(Object.entries(this.packages).map(async ([id, data]) => {
        this.debug('adding package %o with args: %o', id, data);
        if (!require('../utils/is-disabled')(data)) {
          await this.addPackage(id, data);
        }
      }));
    }

    mountScript(contents, {dest = `tmp/${nanoid()}.sh`} = {}) {
      // normalize to a file
      const file = this.normalizeFileInput(contents);
      // make executable
      fs.chmodSync(file, '755');
      // now complete the final mapping for container injection
      return this.addLSF(file, dest, 'user');
    }

    async runHook(hook, {attach = true, user = this.user.name} = {}) {
      return await this.run(['/etc/lando/run-hooks.sh', ...hook], {attach, user, entrypoint: ['/etc/lando/exec.sh']});
    }

    async run(command, {
      attach = true,
      entrypoint = ['/bin/bash', '-c'],
      user = this.user.name,
      workdir = this.workdir,
    } = {}) {
      const bengine = this.getBengine();

      // construct runopts
      const runOpts = {
        image: this.tag,
        attach,
        interactive: this.isInteractive,
        createOptions: {
          User: user,
          Entrypoint: entrypoint,
          Env: this.#run.environment,
          Labels: this.#run.labels,
          WorkingDir: workdir,
          HostConfig: {
            Binds: this.#run.mounts,
          },
        },
      };

      try {
        // run me
        const success = await bengine.run(command, runOpts);
        // augment the success info
        success.context = {command, runOpts};
        // return
        return success;
      } catch (error) {
        // augment error
        error.id = this.id;
        // then throw
        throw error;
      }
    }

    setNPMRC(data) {
      // if a string that exists as a path assume its json
      if (typeof data === 'string' && fs.existsSync(data)) data = require(data);

      // convert to file contents
      const contents = Object.entries(data).map(([key, value]) => `${key}=${value}`);
      contents.push('');

      // write to file
      const npmauthfile = path.join(this.tmpdir, 'npmrc');
      write(npmauthfile, contents.join('\n'));

      // ensure mount
      const mounts = [
        `${npmauthfile}:/home/${this.user.name}/.npmrc:ro`,
        `${npmauthfile}:/root/.npmrc:ro`,
      ];
      this.addLandoServiceData({volumes: mounts});
      this.npmrc = contents.join('\n');
      this.npmrcFile = npmauthfile;
    }
  },
};
