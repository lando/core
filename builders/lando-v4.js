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
      'environment': {},
      'certs': true,
      'packages': {
        'ca-certs': true,
        'sudo': true,
        'useradd': true,
      },
      'ports': [],
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
      'ca-certs': {
        type: 'hook',
        script: path.join(__dirname, '..', 'scripts', 'install-ca-certs.sh'),
        group: 'boot',
      },
      'sudo': {
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
      'useradd': {
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
      this.addLSF(path.join(__dirname, '..', 'scripts', 'add-user.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-updates.sh'));
      this.addLSF(path.join(__dirname, '..', 'scripts', 'install-bash.sh'));
    }

    constructor(id, options, app, lando) {
      // @TODO: rework networking tests
      // @TODO: groupadd failure?
      // @TODO: fix tests first?
      // @TODO: add in cert tests
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

      // @TODO: add debugging and improve logix/grouping of stuff
      // @TODO: reconsider root disallow?

      // @TODO: consolidate hostname/urls/etc?
      // @TODO: move createuser to a special thing since its not a package?
      // @TODO: overrides?

      // @TODO: better appmount logix?
      // @TODO: allow additonal users to be installed in config.users?
      // @TODO: socat package?
      // @TODO: change lando literal to "lando product"
      // @TODO: separate out tests into specific features eg lando-v4-certs lando-v4-users

      // @TODO: dynamic environment stuff? /etc/lando/environment?
        // @TODO: requires a command wrapper script?
        // @TODO: added to lashrc?

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
      if (!require('../utils/is-disabled')(this.user)) this.addUser(this.user);

      // build script
      // @TODO: handle array content?
      // @TODO: halfbaked
      this.buildScript = config?.build?.app ?? false;

      // volumes
      if (config['app-mount']) this.setAppMount(config['app-mount']);

      // auth stuff
      this.setSSHAgent();
      this.setNPMRC(lando.config.pluginConfigFile);

      // ca stuff
      this.cas = [caCert, path.join(path.dirname(caCert), `${caDomain}.pem`)];
      for (const ca of this.cas) {
        if (fs.existsSync(ca)) this.addLSF(ca, `ca-certificates/${path.basename(ca)}`);
      }

      // certs stuff
      // @TODO: make this configurable? allow different certs etc?
      // @TODO: add additional hostnames?
      // @TODO: allow for custom paths, multiple paths etc
      this.certs = config.certs;
      const routes = app?.config?.proxy?.[id] ?? [];
      const urls = routes
        .map(route => route?.hostname ?? route?.host ?? route)
        .map(route => `http://${route}`);
      this.hostnames = [
        ...parseUrls(urls),
        `${this.id}.${this.project}.internal`,
        this.id,
        'localhost',
      ];
      // @NOTE: we use an event here because we generateCert is async and we cannot do it in the constructor
      // @TODO: do we have better hostnames at this point?
      // @TODO: generate pem as well?
      app.events.on('pre-services-generate', async services => {
        const {certPath, keyPath} = await lando.generateCert(`${this.id}.${this.project}`, {domains: this.hostnames});
        this.addServiceData({
          volumes: [
            `${certPath}:/certs/cert.crt`,
            `${keyPath}:/certs/cert.key`,
          ],
        });
      });

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
      this.packages = config.packages ?? {};
      for (const [id, data] of Object.entries(this.packages)) {
        if (!require('../utils/is-disabled')(data)) {
          this.addPackage(id, data);
        }
      }

      // add a home folder persistent mount
      this.addComposeData({volumes: {[this.homevol]: {}}});
      // add build vols
      this.addAppBuildVolume(`${this.homevol}:/home/${this.user.name}`);
      // add command if we have one
      if (this.command) this.addServiceData({command: this.command});

      // add main dc stuff
      // @TODO: other good lando envvars/labels/logs would be good to put in the ones from v3 even if
      // they are duplicated so this is portable and consistent?
      this.addServiceData({
        environment: {
          ...config.environment,
        },
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
      // @TODO: should this throw or just log?
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

    addUser(user) {
      this.addSteps({group: 'setup-user', instructions: `
        RUN /etc/lando/add-user.sh ${require('../utils/parse-v4-pkginstall-opts')(user)}`,
      });
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
