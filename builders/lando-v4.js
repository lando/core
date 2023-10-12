'use strict';

const isObject = require('lodash/isPlainObject');
const merge = require('lodash/merge');

const isDisabled = require('../utils/is-disabled');

const normalizeAppMount = mount => {
  // @TODO: are there any errors we should throw here?
  // if mount is a string the parse into an object
  if (typeof mount === 'string') mount = {target: mount.split(':')[0], type: mount.split(':')[1] || 'bind'};
  // if we have dest|destination and not target then map them over
  if (!mount.target && mount.dest) mount.target = mount.dest;
  if (!mount.target && mount.destination) mount.target = mount.destination;
  // return
  return mount;
};

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  api: 4,
  name: 'lando',
  defaults: {
    image: {
      context: [],
    },
    volumes: [],
  },
  parent: 'l337',
  builder: (parent, defaults) => class LandoServiceV4 extends parent {
    #groups
    #stages

    static debug = require('debug')('lando-service-v4');

    constructor(id, options) {
      // merge configs ontop of defaults
      const config = merge({}, defaults, options.config);

      // normalize image data
      // @TODO: normalize image func?
      const image = isObject(config.image) ? config.image : {imagefile: config.image};
      // @TODO: throw if imagefile/etc is not set

      // normalize app-mount
      if (!config.appMount) config.appMount = config['app-mount'];
      // set to false if its disabled otherwise normalize
      const appMount = isDisabled(config.appMount) ? false : normalizeAppMount(config.appMount);
      // @TODO: throw if appmount.target is a string and not an absolute path
      // put together the stuff we can pass directly into super and leverage l337
      const l337 = {appMount, image};
      // if a command is set then lets pass that through as well
      if (config.command) l337.command = config.command;

      // appmount must be an absolute path

      // if we have a string appmount then standardize it into object format
      // 3. app-mount
      // 4. ports?
      // 5. groups/stages

      // l337me
      super(id, Object.assign(options, {config: l337}));


      // what stages do we
      // how we run steps
      // image
      // app-build
      // background-exec?

      // what build groups do we need?
      // how we order steps

      // what is the purpose of boot?
      // ensure some minimal set of dependencies and map the user
      // boot.context
      // boot.install
      // boot.user

      // system.context
      // system.install

      // user.context
      // user.image
      // user.app-build
      // user.background-exec

      // add build groups

      // @TODO:
      // 2. boot?
      // 3. overrides

      // try to mock up some shit
      // nginx/apache
      // mariadb
      // php

      // drupal
      // webserver: user, config, appmount, certs, ports, build.exec
      // mariadb: user, config, ports, storage, healthcheck
      // php: user, config, appmount, ports, build.image, build.app

      // othershit
      // parent stuff

      // ssh-keys?

      // console.log('hellp there')
      // console.log(this);
      // process.exit(1)


      // Envvars & Labels
      // const environment = {
      //   LANDO_SERVICE_API: 4,
      //   LANDO_SERVICE_NAME: name,
      //   LANDO_SERVICE_TYPE: type,
      // };
      // // should be state data that lando uses?
      // // user/team that "owns" the image
      // const labels = {
      //   'dev.lando.api': 4,
      // };
      // // Set a reasonable log size
      // const logging = {driver: 'json-file', options: {'max-file': '3', 'max-size': '10m'}};
      // // basic docker compose file
      // this.addComposeData({
      //   services: _.set({}, name, {
      //     environment,
      //     labels,
      //     logging,
      //     ports: ['80'],
      //   }),
      // });
    };
  },
};
