'use strict';

const fs = require('fs');
const isObject = require('lodash/isPlainObject');
const merge = require('lodash/merge');
const path = require('path');
const uniq = require('lodash/uniq');
const read = require('../utils/read-file');
const write = require('../utils/write-file');

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
      'command': 'sleep infinity || tail -f /dev/null',
      'packages': {
        sudo: true,
        useradd: true,
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

    #appBuildOpts = {
      environment: [],
      mounts: [],
    }

    #installers = {
      createuser: {
        type: 'script',
        script: path.join(__dirname, '..', 'scripts', 'add-user.sh'),
        group: 'setup-user',
      },
      sudo: {
        type: 'hook',
        script: path.join(__dirname, '..', 'scripts', 'install-sudo.sh'),
        group: 'boot',
        instructions: {
          'setup-user-1-after': (data, {user}) => `
            RUN touch /etc/sudoers
            RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
            RUN getent group sudo > /dev/null || groupadd sudo
            RUN usermod -aG sudo ${user.name}
          `,
        },
      },
      useradd: {
        type: 'hook',
        script: path.join(__dirname, '..', 'scripts', 'install-useradd.sh'),
        group: 'boot',
        priority: 10,
      },
    };

    #setupBootScripts() {
      this.addContext(`${path.join(__dirname, '..', 'scripts', 'lash')}:/bin/lash`);
      this.addLashRC(path.join(__dirname, '..', 'scripts', 'utils.sh'), {priority: '000'});
      this.addLashRC(path.join(__dirname, '..', 'scripts', 'env.sh'), {priority: '001'});
      this.addLSF(path.join(__dirname, '..', 'scripts', 'boot.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'run-hooks.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'landorc'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'utils.sh'), 'lando-utils.sh');
      this.addLSF(path.join(__dirname, '..', 'scripts', 'env.sh'), 'lando-env.sh');
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-updates.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-bash.sh'));
    }

    constructor(id, options, app, lando) {
      // @TODO: better appmount logix?
      // @TODO: allow additonal users to be installed in config.users?
      // @TODO: socat package?

      // before we call super we need to separate things
      const {config, ...upstream} = merge({}, defaults, options);
      // ger user info
      const {gid, uid, username} = lando.config;
      // consolidate user info with any incoming stuff
      const user = merge({}, {gid, uid, name: username}, require('../utils/parse-v4-user')(config.user));

      // add some upstream stuff and legacy stuff
      upstream.appMount = config['app-mount'].destination;
      upstream.legacy = merge({}, upstream.legacy ?? {}, {meUser: user.name});
      // this will change but for right now i just need the image stuff to passthrough
      upstream.config = {image: config.image};

      // add a user build group
      groups.user = {
        description: 'Catch all group for things that should be run as the user',
        weight: 2000,
        user: user.name,
      };

      // get this
      super(id, merge({}, {groups}, {states}, upstream));

      // meta
      this.isInteractive = lando.config.isInteractive;
      this.project = app.project;
      this.router = options.router;

      // command
      this.command = config.command;

      // healthcheck stuff
      this.canHealthcheck = true;
      this.healthcheck = config.healthcheck ?? false;

      // userstuff
      this.user = user;
      this.homevol = `${this.project}-${this.user.name}-home`;
      this.datavol = `${this.project}-${this.id}-data`;

      // build script
      // @TODO: handle array content?
      this.buildScript = config?.build?.app ?? false;
      this.packages = config.packages ?? {};

      // set some other stuff
      if (config['app-mount']) this.setAppMount(config['app-mount']);

      // auth stuff
      this.setSSHAgent();
      this.setNPMRC(lando.config.pluginConfigFile);

      // setup user
      // @TODO: move createuser to a special thing since its not a package?
      this.packages.createuser = this.user;

      // @TODO: try alpine?
      // @TODO: cert-install stuff
        // 1. generate certs on host
        // 2. install cert package
        // 3. put cert in correct location(s)?
        // 4. refresh cert store

      // @TODO: add debugging and improve logix
      // @TODO: change lando literal to "lando product"

      // boot stuff
      // @TODO: consolidate all of this elsewhere so constructor isnt SFB?
      this.#setupBootScripts();
      this.addSteps({group: 'boot', instructions: `
        ENV RUNNER 1
        ENV DEBUG ${lando.debuggy ? 1 : 0}
        ENV LANDO_DEBUG ${lando.debuggy ? 1 : 0}
        RUN mkdir -p /etc/lando
        RUN chmod 777 /etc/lando
        RUN /etc/lando/boot.sh
      `});

      // go through all groups except boot and add run-hook stuffs
      for (const hook of Object.keys(this._data.groups).filter(group => parseInt(group.weight) <= 100)) {
        this.addSteps({group: hook, instructions: `
          RUN mkdir -p /etc/lando/${hook}.d
          RUN /etc/lando/run-hooks.sh ${hook}
        `});
      }

      // go through all packages and add them
      for (const [id, data] of Object.entries(this.packages)) {
        if (!require('../utils/is-disabled')(data)) {
          this.addPackage(id, data);
        }
      }

      // add a home folder persistent mount
      this.addComposeData({volumes: {[this.homevol]: {}}});
      // add build vols
      this.addAppBuildVolume(`${this.homevol}:/home/${this.user.name}`);
      // add main dc stuff
      this.addServiceData({
        command: this.command,
        user: this.user.name,
        volumes: [
          `${this.homevol}:/home/${this.user.name}`,
        ],
      });
    }

    addHookFile(file, {hook = 'boot', priority = '100'} = {}) {
      this.addContext(`${file}:/etc/lando/${hook}.d/${priority}-${path.basename(file)}`, `${hook}-1000-before`);
    }

    addLashRC(file, {priority = '100'} = {}) {
      this.addContext(`${file}:/etc/lando/lash.d/${priority}-${path.basename(file)}`);
    }

    addPackageInstaller(id, data) {
      this.#installers[id] = data;
    }

    addPackage(id, data = []) {
      // check if we have an package installer
      // TODO: should this throw or just log?
      if (this.#installers[id] === undefined) throw new Error(`Could not find a package installer for ${id}!`);

      // normalize data
      if (!Array.isArray(data)) data = [data];

      // get installer
      const installer = this.#installers[id];

      // do different stuff based on type
      switch (installer.type) {
        case 'hook':
          this.addHookFile(installer.script, {hook: installer.group, priority: installer.priority});
          break;
        case 'script':
          // @TODO: loop through data and add multiple ones?
          // @TODO: parse data into options
          this.addLSF(installer.script, `installers/${path.basename(installer.script)}`);
          for (const options of data) {
            this.addSteps({group: installer.group, instructions: `
              RUN /etc/lando/installers/${path.basename(installer.script)} ${require('../utils/parse-v4-pkginstall-opts')(options)}`, // eslint-disable-line max-len
            });
          }
          break;
      }

      // handle additional instructions function if its just a single thing
      if (installer.instructions && typeof installer.instructions === 'function') {
        installer.instructions = {[installer.group]: installer.instructions};
      }

      // handle additional instructions if its an object of group functions
      if (installer.instructions && isObject(installer.instructions)) {
        for (const [group, instructFunc] of Object.entries(installer.instructions)) {
          if (instructFunc && typeof instructFunc === 'function') {
            this.addSteps({group, instructions: instructFunc(data, this)});
          }
        }
      }
    }

    addLSF(source, dest, {context = 'context'} = {}) {
      if (dest === undefined) dest = path.basename(source);
      this.addContext(`${source}:/etc/lando/${dest}`, context);
    }

    addAppBuildVolume(volumes) {
      if (Array.isArray(volumes)) {
        this.#appBuildOpts.mounts.push(...volumes);
      } else {
        this.#appBuildOpts.mounts.push(volumes);
      }
    }

    // buildapp
    async buildApp() {
      // bail if no script
      if (!this.buildScript) {
        this.debug(`no build detected for ${this.id}, skipping`);
        return;
      };

      // get build func
      const bengine = LandoServiceV4.getBengine(LandoServiceV4.bengineConfig, {
        builder: LandoServiceV4.builder,
        debug: this.debug,
        orchestrator: LandoServiceV4.orchestrator,
      });

      // generate the build script
      const buildScript = require('../utils/generate-build-script')(
        this.buildScript,
        this.user.name,
        this.user.gid,
        process.platform === 'linux' ? process.env.SSH_AUTH_SOCK : `/run/host-services/ssh-auth.sock`,
        this.appMount,
      );
      const buildScriptPath = path.join(this.context, 'app-build.sh');
      write(buildScriptPath, buildScript);

      try {
        // set state
        this.state = {APP: 'BUILDING'};

        // stuff
        const bs = `/etc/lando/build/app.sh`;
        const command = `chmod +x ${bs} && sh ${bs}`;

        // add build vols
        this.addAppBuildVolume(`${buildScriptPath}:${bs}`);

        // run with the appropriate builder
        const success = await bengine.run([command], {
          image: this.tag,
          attach: true,
          interactive: this.isInteractive,
          createOptions: {
            User: this.user.name,
            WorkingDir: this.appMount,
            Entrypoint: ['/bin/sh', '-c'],
            Env: uniq(this.#appBuildOpts.environment),
            HostConfig: {
              Binds: [...uniq(this.#appBuildOpts.mounts)],
            },
          },
        });

        // // augment the success info
        success.context = {script: read(buildScriptPath)};
        // state
        this.state = {APP: 'BUILT'};
        // log
        this.debug('app %o built successfully from %o', `${this.project}-${this.id}`, buildScriptPath);
        return success;

      // failure
      } catch (error) {
        // augment error
        error.id = this.id;
        error.context = {script: read(buildScriptPath), path: buildScriptPath};
        this.debug('app %o build failed with code %o error %o', `${this.project}-${this.id}`, error.code, error);
        // set the build failure
        this.state = {APP: 'BUILD FAILURE'};
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
      this.addServiceData({volumes: mounts});
      this.addAppBuildVolume(mounts);
      this.npmrc = contents.join('\n');
      this.npmrcFile = npmauthfile;
    }

    // sets ssh agent and prepares for socating
    // DD ssh-agent is a bit strange and we wont use it in v4 plugin but its easiest for demoing purposes
    // if you have issues with it its best to do the below
    // 0. Close Docker Desktop
    // 1. killall ssh-agent
    // 2. Start Docker Desktop
    // 3. Open a terminal (after Docker Desktop starts)
    // 4. ssh-add (use the existing SSH agent, don't start a new one)
    // 5. docker run --rm --mount type=bind,src=/run/host-services/ssh-auth.sock,target=/run/host-services/ssh-auth.sock -e SSH_AUTH_SOCK="/run/host-services/ssh-auth.sock" --entrypoint /usr/bin/ssh-add alpine/git -l
    setSSHAgent() {
      const socket = process.platform === 'linux' ? process.env.SSH_AUTH_SOCK : `/run/host-services/ssh-auth.sock`;
      const socater = `/run/ssh-${this.user.name}.sock`;

      // only add if we have a socket
      if (socket) {
        this.addComposeData({services: {[this.id]: {
          environment: {
            SSH_AUTH_SOCK: socater,
          },
          volumes: [
            `${socket}:${socket}`,
          ],
        }}});

        this.#appBuildOpts.environment.push(`SSH_AUTH_SOCK=${socater}`);
        this.addAppBuildVolume(`${socket}:${socket}`);
      }
    }

    // @TODO: more powerful syntax eg go as many levels as you want and maybe ! syntax?
    setAppMount(config) {
      // reset the destination
      this.#appMount.destination = config.destination;

      // its easy if we dont have any excludes
      if (config.exclude.length === 0) {
        this.#appMount.binds = [`${this.appRoot}:${config.destination}`];
        this.addAppBuildVolume(`${this.appRoot}:${config.destination}`);

      // if we have excludes then we need to compute somethings
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
            this.addAppBuildVolume(`${this.project}_app-mount-${path}:${this.#appMount.destination}/${path}`);
          } else {
            this.addAppBuildVolume(`${this.appRoot}/${path}:${this.#appMount.destination}/${path}`);
          }
        });
      }

      // add named volumes if we need to
      if (this.#appMount.volumes.length > 0) {
        this.addComposeData({volumes: Object.fromEntries(this.#appMount.volumes.map(vol => ([vol, {}])))});
      }

      // set bindz
      this.addServiceData({volumes: this.#appMount.binds});

      // set infp
      this.appMount = config.destination;
      this.info.appMount = this.appMount;
    }
  },
};
