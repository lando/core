'use strict';

const fs = require('fs');
const isObject = require('lodash/isPlainObject');
const merge = require('lodash/merge');
const path = require('path');
const uniq = require('lodash/uniq');
const write = require('../utils/write-file');

const sargv = require('string-argv').parseArgsStringToArgv;

const states = {APP: 'UNBUILT'};
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
  'config': {
    description: 'Configuration file stuff',
    weight: 500,
    user: 'root',
  },
};

// @TODO: move this into utils and reuse in app-generate-certs.js?
const parseUrls = (urls = []) => {
  return urls.map(url => {
    try {
      url = new URL(url);
      return url.hostname;
    } catch {
      return undefined;
    }
  })
  .filter(hostname => hostname !== undefined);
};

// get hostnames
const getHostnames = ({app, id, project}) => {
  const routes = app?.config?.proxy?.[id] ?? [];
  const urls = routes
    .map(route => route?.hostname ?? route?.host ?? route)
    .map(route => `http://${route}`);
  return [
    ...parseUrls(urls),
    `${id}.${project}.internal`,
    id,
  ];
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
      'app-mount': {
        type: 'bind',
        destination: '/app',
        exclude: [],
      },
      'certs': true,
      'environment': {},
      'hostnames': [],
      'packages': {
        'git': true,
        'proxy': true,
        'ssh-agent': true,
        'sudo': true,
      },
      'ports': [],
      'security': {
        'ca': [],
        'certificate-authority': [],
        'cas': [],
        'certificate-authorities': [],
      },
    },
  },
  router: () => ({}),
  builder: (parent, defaults) => class LandoServiceV4 extends parent {
    static debug = require('debug')('@lando/l337-service-v4');

    #appMount = {
      type: 'bind',
      destination: '/app',
      exclude: [],
      volumes: [],
      binds: [],
    }

    #run = {
      environment: [],
      labels: {},
      mounts: [],
    }

    #installers = {
      'git': require('../packages/git/git'),
      'proxy': require('../packages/proxy/proxy'),
      'sudo': require('../packages/sudo/sudo'),

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
      // if data is an array then lets concat and uniq to #mounts
      if (Array.isArray(data)) this.#run.mounts = uniq([...this.#run.mounts, ...data]);
    }

    #setupBoot() {
      this.addContext(`${path.join(__dirname, '..', 'scripts', 'lash')}:/bin/lash`);
      this.addLSF(path.join(__dirname, '..', 'scripts', 'boot.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'run-hooks.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'start.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'landorc'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'utils.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'environment.sh'), 'environment');
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-updates.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-bash.sh'));
      this.addSteps({group: 'boot', instructions: `
        RUN mkdir -p /etc/lando /etc/lando/env.d /etc/lando/build/image
        RUN chmod 777 /etc/lando
        RUN ln -sf /etc/lando/environment /etc/profile.d/lando.sh
        RUN /etc/lando/boot.sh
        SHELL ["/bin/bash", "-c"]
      `});
    }

    #setupHooks() {
      for (const hook of Object.keys(this._data.groups).filter(group => parseInt(group.weight) <= 100)) {
        this.addSteps({group: hook, instructions: `
          RUN mkdir -p /etc/lando/build/image/${hook}.d
          RUN /etc/lando/run-hooks.sh image ${hook}
        `});
      }
    }

    #setupSecurity(security) {
      // right now this is mostly just CA setup, lets munge it all together and normalize and whatever
      const cas = [security.ca, security.cas, security['certificate-authority'], security['certificate-authorities']]
        .flat(Number.POSITIVE_INFINITY)
        .filter(cert => fs.existsSync(cert))
        .map(cert => path.isAbsolute(cert) ? cert : path.resolve(this.appRoot, cert));

      // add ca-cert install hook if we have some to add
      if (cas.length > 0) {
        this.addHookFile(path.join(__dirname, '..', 'scripts', 'install-ca-certs.sh'), {hook: 'boot'});
      }

      // inject them
      for (const ca of cas) this.addLSF(ca, `ca-certificates/${path.basename(ca)}`);
    }

    constructor(id, options, app, lando) {
      // @TODO: hostname stuff?
        // add hostnames?
        // better wrapper stuff around proxy?

        // @TODO: add additional hostnames?
        // @TODO: do we have better hostnames at this point?

      // @TODO: better CA/cert envvars?
      // @TODO: add in cert tests

      // @TODO: add debugging and improve logix/grouping of stuff
      // @TODO: consolidate hostname/urls/etc?
      // @TODO: overrides for run and compose?
      // @TODO: other good lando envvars/labels/logs would be good to put in the ones from v3 even if
      // we do have appenv and applabel on lando.config?

      /*
      # Should have the correct entries in /certs/cert.ext
      cd lamp
      lando ssh -s appserver -c "cat /certs/cert.ext" | grep DNS.1 | grep -w appserver.landolamp.internal
      lando ssh -s appserver -c "cat /certs/cert.ext" | grep DNS.2 | grep -w appserver
      lando ssh -s appserver -c "cat /certs/cert.ext" | grep DNS.3 | grep -w localhost
      lando ssh -s appserver -c "cat /certs/cert.ext" | grep lando-lamp.lndo.site
      cd .. && cd lemp
      lando ssh -s placeholder -c "cat /certs/cert.ext" | grep DNS.1 | grep -w placeholder.landolemp.internal
      lando ssh -s placeholder -c "cat /certs/cert.ext" | grep DNS.2 | grep -w placeholder
      lando ssh -s placeholder -c "cat /certs/cert.ext" | grep DNS.3 | grep -w localhost
      lando ssh -s placeholder -c "cat /certs/cert.ext" | grep placeholder.lando-lemp.lndo.site
      */

      // @TODO: better appmount logix?
      // @TODO: allow additonal users to be installed in config.users?
      // @TODO: change lando literal to "lando product"
      // @TODO: separate out tests into specific features eg lando-v4-certs lando-v4-users
      // @TODO: debug/lando_debug should be set with env?

      // get stuff from config
      const {caCert, caDomain, gid, uid, username} = lando.config;
      // before we call super we need to separate things
      const {config, ...upstream} = merge({}, defaults, options);
      // consolidate user info with any incoming stuff
      const user = merge({}, {gid, uid, name: username}, require('../utils/parse-v4-user')(config.user));

      // add some upstream stuff and legacy stuff
      upstream.appMount = config['app-mount'].destination;
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
      super(id, merge({}, {groups}, {states}, upstream), app, lando);

      // more this
      this.canHealthcheck = true;
      this.certs = config.certs;
      this.command = config.command;
      this.generateCert = lando.generateCert.bind(lando);
      this.healthcheck = config.healthcheck ?? false;
      this.hostnames = uniq([...getHostnames({app, ...this}), ...config.hostnames]);
      this.isInteractive = lando.config.isInteractive;
      this.packages = config.packages;
      this.project = app.project;
      this.router = options.router;
      this.security = config.security;
      this.security.cas.push(caCert, path.join(path.dirname(caCert), `${caDomain}.pem`));
      this.user = user;

      // computed this
      this.homevol = `${this.project}-${this.user.name}-home`;
      this.datavol = `${this.project}-${this.id}-data`;

      // debug stuff must come first
      if (lando.debuggy) {
        this.addSteps({group: 'boot', instructions: `
          ENV DEBUG 1
          ENV LANDO_DEBUG 1
        `});
      }

      // boot stuff
      this.#setupBoot();
      // hook system
      this.#setupHooks();
      // handle security considerations
      this.#setupSecurity(this.security);
      // userstuff
      this.addUser(this.user);

      // if the proxy package and proxy config is on then reset its config
      if (!require('../utils/is-disabled')(config?.packages?.proxy) && lando.config?.proxy === 'ON') {
        config.packages.proxy = {
          id: this.id,
          volume: `${lando.config.proxyName}_proxy_config`,
          project: this.project,
        };
      }

      // build script
      // @TODO: handle array content?
      // @TODO: halfbaked
      this.buildScript = config?.build?.app ?? false;

      // volumes
      if (config['app-mount']) this.setAppMount(config['app-mount']);

      // auth stuff
      // @TODO: make this into a package?
      this.setNPMRC(lando.config.pluginConfigFile);

      // go through all packages and add them
      for (const [id, data] of Object.entries(config.packages)) {
        this.debug('adding package %o with args: %o', id, data);
        if (!require('../utils/is-disabled')(data)) {
          this.addPackage(id, data);
        }
      }

      // add a home folder persistent mount
      this.addComposeData({volumes: {[this.homevol]: {}}});

      // add main dc stuff
      this.addLandoServiceData({
        environment: {
          PIROG: 'tester',
          ...config.environment,
        },
        user: this.user.name,
        volumes: [
          `${this.homevol}:/home/${this.user.name}`,
        ],
      });
    }

    addHookFile(file, {id = undefined, hook = 'boot', stage = 'image', priority = '100'} = {}) {
      // if file is actually script content we need to normalize and dump it first
      if (!require('valid-path')(file, {simpleReturn: true})) {
        const leader = file.split('\n').find(line => line.length > 0).match(/^\s*/)[0].length ?? 0;
        const contents = file
          .split('\n')
          .map(line => line.slice(leader))
          .join('\n');

        // reset file to a path
        file = path.join(this.context, id ? `${priority}-${id}.sh` : `${priority}-${stage}-${hook}.sh`);
        write(file, contents);
      }

      // image stage should add directly to the build context
      if (stage === 'image') {
        this.addContext(
          `${file}:/etc/lando/build/image/${hook}.d/${priority}-${path.basename(file)}`,
          `${hook}-1000-before`,
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

    addPackage(id, data = []) {
      // check if we have an package installer
      // @TODO: should this throw or just log?
      if (this.#installers[id] === undefined || typeof this.#installers[id] !== 'function') {
        throw new Error(`Could not find a package installer functionfor ${id}!`);
      }

      // normalize data
      if (!Array.isArray(data)) data = [data];

      // run installer
      this.#installers[id](this, ...data);
    }

    addLSF(source, dest, {context = 'context'} = {}) {
      if (dest === undefined) dest = path.basename(source);
      this.addContext(`${source}:/etc/lando/${dest}`, context);
    }

    addUser(user) {
      this.addLSF(path.join(__dirname, '..', 'scripts', 'add-user.sh'));
      this.addHookFile(path.join(__dirname, '..', 'scripts', 'install-useradd.sh'), {hook: 'boot', priority: 10});
      this.addSteps({group: 'setup-user', instructions: `
        RUN /etc/lando/add-user.sh ${require('../utils/parse-v4-pkginstall-opts')(user)}`,
      });
    }

    addCerts({cert, key}) {
      // if cert is true then just map to the usual
      if (this.certs === true) this.certs = '/etc/lando/certs/cert.crt';

      // if cert is a string then compute the key and objectify
      if (typeof this.certs === 'string') this.certs = {cert: this.certs};

      // if cert is an object with no key then compute the key with the cert
      if (isObject(this.certs) && this.certs?.key === undefined) {
        this.certs.key = path.join(path.dirname(this.certs.cert), 'cert.key');
      }

      // make sure both cert and key are arrays
      if (typeof this.certs?.cert === 'string') this.certs.cert = [this.certs.cert];
      if (typeof this.certs?.key === 'string') this.certs.key = [this.certs.key];

      // build the volumes
      const volumes = uniq([
        ...this.certs.cert.map(file => `${cert}:${file}`),
        ...this.certs.key.map(file => `${key}:${file}`),
        `${cert}:/etc/lando/certs/cert.crt`,
        `${key}:/etc/lando/certs/cert.key`,
      ]);

      // add things
      this.addLandoServiceData({
        volumes,
        environment: {
          LANDO_SERVICE_CERT: this.certs.cert[0],
          LANDO_SERVICE_KEY: this.certs.key[0],
        },
      });
    }

    // wrapper around addServiceData so we can also add in #run stuff
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
      try {
        // set state
        this.info = {state: {APP: 'BUILDING'}};

        // run internal root app build first
        await this.runHook(['app', 'internal-root'], {attach: false, user: 'root'});

        // run user build scripts if we have them
        if (this.buildScript && typeof this.buildScript === 'string') {
          this.addHookFile(this.buildScript, {stage: 'app', hook: 'user'});
          await this.runHook(['app', 'user']);
        };

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
      // do the certs stuff here cause we need async
      if (this.certs) {
        const {certPath, keyPath} = await this.generateCert(`${this.id}.${this.project}`, {domains: this.hostnames});
        this.addCerts({cert: certPath, key: keyPath});
      }

      // build the image
      const image = await super.buildImage();
      // determine the command and normalize it for wrapper
      const command = this.command ?? image?.info?.Config?.Cmd ?? image?.info?.ContainerConfig?.Cmd;

      // if command if null or undefined then throw error
      // @TODO: better error?
      if (command === undefined || command === null) {
        throw new Error(`${this.id} has no command set!`);
      }

      // parse command
      const parseCommand = command => typeof command === 'string' ? sargv(command) : command;
      // add command wrapper to image
      this.addLandoServiceData({command: ['/etc/lando/start.sh', ...parseCommand(command)]});

      // return
      return image;
    }

    async runHook(hook, {attach = true, user = this.user.name} = {}) {
      return await this.run(hook, {attach, user, entrypoint: ['/etc/lando/run-hooks.sh']});
    }

    async run(command, {
      attach = true,
      user = this.user.name,
      workingDir = this.appMount,
      entrypoint = ['/bin/sh', '-c'],
    } = {}) {
      const bengine = LandoServiceV4.getBengine(LandoServiceV4.bengineConfig, {
        builder: LandoServiceV4.builder,
        debug: this.debug,
        orchestrator: LandoServiceV4.orchestrator,
      });

      // construct runopts
      const runOpts = {
        image: this.tag,
        attach,
        interactive: this.isInteractive,
        createOptions: {
          User: user,
          WorkingDir: workingDir,
          Entrypoint: entrypoint,
          Env: this.#run.environment,
          Labels: this.#run.labels,
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
      const npmauthfile = path.join(this.context, 'npmrc');
      write(npmauthfile, contents.join('\n'));

      // ensure mount
      const mounts = [
        `${npmauthfile}:/home/${this.user.name}/.npmrc`,
        `${npmauthfile}:/root/.npmrc`,
      ];
      this.addLandoServiceData({volumes: mounts});
      this.npmrc = contents.join('\n');
      this.npmrcFile = npmauthfile;
    }

    // @TODO: more powerful syntax eg go as many levels as you want and maybe ! syntax?
    setAppMount(config) {
      // reset the destination
      this.#appMount.destination = config.destination;

      // its easy if we dont have any excludes
      if (config.exclude.length === 0) {
        this.#appMount.binds = [`${this.appRoot}:${config.destination}`];

      // if we have excludes then we need to compute somethings
      // @TODO: this is busted and needs to be redone when we have a deeper "mounting"
      // system
      } else {
        // named volumes for excludes
        this.#appMount.volumes = config.exclude.map(vol => `app-mount-${vol}`);
        // get all paths to be considered
        const binds = [
          ...fs.readdirSync(this.appRoot).filter(path => !config.exclude.includes(path)),
          ...config.exclude,
        ];
        // map into bind mounts
        this.#appMount.binds = binds.map(path => {
          if (config.exclude.includes(path)) return `app-mount-${path}:${this.#appMount.destination}/${path}`;
          else return `${this.appRoot}/${path}:${this.#appMount.destination}/${path}`;
        });
        // and again for appBuild stuff b w/ full mount name
        binds.map(path => {
          if (config.exclude.includes(path)) {
            // this.addAppBuildVolume(`${this.project}_app-mount-${path}:${this.#appMount.destination}/${path}`);
          } else {
            // this.addAppBuildVolume(`${this.appRoot}/${path}:${this.#appMount.destination}/${path}`);
          }
        });
      }

      // add named volumes if we need to
      if (this.#appMount.volumes.length > 0) {
        this.addComposeData({volumes: Object.fromEntries(this.#appMount.volumes.map(vol => ([vol, {}])))});
      }

      // set bindz
      this.addLandoServiceData({volumes: this.#appMount.binds});

      // set infp
      this.appMount = config.destination;
      this.info = {appMount: this.appMount};
    }
  },
};
