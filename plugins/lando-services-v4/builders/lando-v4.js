'use strict';

const merge = require('lodash/merge');

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  api: 4,
  name: 'lando',
  defaults: {
    user: 'me',
  },
  parent: 'l337',
  builder: (parent, defaults) => class LandoServiceV4 extends parent {
    constructor(id, options) {
      const config = merge({}, defaults, options.config);

      // lets build parent config so we can leverage it
      // @TODO: appmount
      // @TODO: parent


      const l337Config = {command: config.command, image: config.image};

      // do things before super
      // 1. extract 1337 things from options
      //    * set appmount volume or copy?
      //    * parent?

      super(id, Object.assign(options, {config: l337Config}));


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
