'use strict';

const fs = require('fs');
const merge = require('lodash/merge');
const path = require('path');
const uniq = require('lodash/uniq');

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

    constructor(id, options, app, lando) {
      // before we call super we need to separate things
      const {config, ...upstream} = merge({}, defaults, options);
      // @TODO: certs?
      // @TODO: better appmount logix?

      // ger user info
      const {gid, uid, username} = lando.config;

      // add some upstream stuff and legacy stuff
      upstream.appMount = config['app-mount'].destination;
      upstream.legacy = merge({}, {meUser: username}, upstream.legacy ?? {});

      // add a user build group
      groups.user = {
        description: 'Catch all group for things that should be run as the user',
        weight: 2000,
        user: username,
      };

      // get this
      super(id, {...upstream, groups, states});

      // helpful
      this.project = app.project;
      this.router = options.router;
      this.isInteractive = lando.config.isInteractive;

      // userstuff
      this.gid = gid;
      this.uid = uid;
      this.username = username;
      this.homevol = `${this.project}-${username}-home`;
      this.datavol = `${this.project}-${this.id}-data`;

      // build script
      // @TODO: handle array content?
      this.buildScript = config?.build?.app ?? `true`;

      // set some other stuff
      if (config['app-mount']) this.setAppMount(config['app-mount']);

      // auth stuff
      this.setSSHAgent();
      this.setNPMRC(lando.config.pluginConfigFile);

      // @NOTE: uh?
      this.addSteps({group: 'boot', instructions: `
        RUN rm /bin/sh && ln -s /bin/bash /bin/sh
      `});

      // @NOTE: setup dat user
      this.addSteps({group: 'setup-user', instructions: `
        RUN sed -i '/UID_MIN/c\UID_MIN 500' /etc/login.defs
        RUN sed -i '/UID_MAX/c\UID_MAX 600100000' /etc/login.defs
        RUN sed -i '/GID_MIN/c\GID_MIN 20' /etc/login.defs
        RUN sed -i '/GID_MAX/c\GID_MAX 600100000' /etc/login.defs
        RUN getent group ${this.gid} > /dev/null || groupadd -g ${this.gid} ${this.username}
        RUN useradd -u ${this.uid} -m -g ${this.gid} ${this.username}
        RUN usermod -aG sudo ${this.username}
        RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
      `});

      // inject global npmrc if we can

      // add a home folder persistent mount
      this.addComposeData({volumes: {[this.homevol]: {external: true}}});
      // add the usual DC stuff
      this.addServiceData({user: this.username, volumes: [`${this.homevol}:/home/${this.username}`]});
    }

    // buildapp
    async buildApp() {
      // bail if no script
      if (!this.buildScript) {
        this.debug('no build detected, skipping');
        return;
      };

      // get build func
      const bengine = LandoServiceV4.getBengine(LandoServiceV4.bengineConfig, {
        builder: LandoServiceV4.builder,
        debug: this.debug,
        orchestrator: LandoServiceV4.orchestrator,
      });

      // generate the build script
      const buildScript = require('../utils/generate-build-script')(this.buildScript, this.username, this.appMount);
      const buildScriptPath = path.join(this.context, 'app-build.sh');
      fs.writeFileSync(buildScriptPath, buildScript);

      try {
        // set state
        this.state = {APP: 'BUILDING'};

        // stuff
        const bs = `/home/${this.username}/app-build.sh`;
        const command = `chmod +x ${bs} && sh ${bs}`;

        // run with the appropriate builder
        const success = await bengine.run([command], {
          image: this.tag,
          attach: true,
          interactive: this.isInteractive,
          createOptions: {
            User: this.username,
            WorkingDir: this.appMount,
            Entrypoint: ['/bin/sh', '-c'],
            Env: uniq(this.#appBuildOpts.environment),
            HostConfig: {
              Binds: [
                `${this.homevol}:/home/${this.username}`,
                ...uniq(this.#appBuildOpts.mounts),
                `${buildScriptPath}:${bs}`,
              ],
            },
          },
        });

        // // augment the success info
        success.context = {script: fs.readFileSync(buildScriptPath, {encoding: 'utf-8'})};
        // state
        this.state = {APP: 'BUILT'};
        // log
        this.debug('app %o built successfully from %o', `${this.project}-${this.id}`, buildScriptPath);
        return success;

      // failure
      } catch (error) {
        // augment error
        error.id = this.id;
        error.context = {script: fs.readFileSync(buildScriptPath, {encoding: 'utf-8'}), path: buildScriptPath};
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
      fs.writeFileSync(npmauthfile, contents.join('\n'));

      // ensure mount
      const mounts = [
        `${npmauthfile}:/home/${this.username}/.npmrc`,
        `${npmauthfile}:/root/.npmrc`,
      ];
      this.addServiceData({volumes: mounts});
      this.#appBuildOpts.mounts.push(...mounts);
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
      const socater = `/run/ssh-${this.username}.sock`;

      this.addComposeData({services: {[this.id]: {
        environment: {
          SSH_AUTH_SOCK: socater,
        },
        volumes: [
          `${socket}:${socket}`,
        ],
      }}});

      this.#appBuildOpts.environment.push(`SSH_AUTH_SOCK=${socater}`);
      this.#appBuildOpts.mounts.push(`${socket}:${socket}`);
    }

    // @TODO: more powerful syntax eg go as many levels as you want and maybe ! syntax?
    setAppMount(config) {
      // reset the destination
      this.#appMount.destination = config.destination;

      // its easy if we dont have any excludes
      if (config.exclude.length === 0) {
        this.#appMount.binds = [`${this.appRoot}:${config.destination}`];
        this.#appBuildOpts.mounts.push(`${this.appRoot}:${config.destination}`);

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
            this.#appBuildOpts.mounts.push(`${this.project}_app-mount-${path}:${this.#appMount.destination}/${path}`);
          } else {
            this.#appBuildOpts.mounts.push(`${this.appRoot}/${path}:${this.#appMount.destination}/${path}`);
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
