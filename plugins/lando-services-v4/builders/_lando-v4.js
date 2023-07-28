'use strict';

// Modules
const _ = require('lodash');

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  api: 4,
  name: '_lando',
  config: {
    pirog: 1,
  },
  parent: '_compose',
  builder: (parent, config) => class LandoServiceV4 extends parent {
    constructor(id, options, {app, lando} = {}) {
      // @TODO: merge in default values?
      super(id, _.merge(config, options));

      // and some other generic properties
      const {name, type, version} = config;

      // Add some info basics
      // @TODO: revisit
      // info.config = config;
      options.info = _.merge({}, options.info, {
        service: name,
        type: type,
        version: version,
      });
      // info.meUser = meUser;
      // info.hasCerts = ssl;

      // @NOTE:
      // 1. restructure file so it rougly works like
      // compute shared stuff eg tag name
      // generate dockerfiles?
      // generate compose files

      // @TODO SCRIPTS:
      // 1. how do we add scripts to the build context?
      // * add a script to the builderfile, have a app.addScript func that also adds script to the builderfile
      // * lando-v4 needs some handler for the scripts metadata -> copy to build context -> COPY scripts /etc/lando

      // @TODO POC BUILDSTEPS?:
      // 1. how do we add ENV/LABELS/USER/RUN instructions (build groups)
      // 2. how do we set the entrypoint/command?

      // @TODO: other things
      // 4. docker compose overrides?

      // Envvars & Labels
      // @TODO: what should go in each?
      // environment should be stuff that the OS/app potential could use
      // @TODO: what is a good set of base data or this?
      const environment = {
        LANDO_SERVICE_API: 4,
        LANDO_SERVICE_NAME: name,
        LANDO_SERVICE_TYPE: type,
      };
      // should be state data that lando uses?
      // user/team that "owns" the image
      const labels = {
        'dev.lando.api': 4,
      };

      // Set a reasonable log size
      const logging = {driver: 'json-file', options: {'max-file': '3', 'max-size': '10m'}};

      // basic docker compose file
      this.addComposeData({
        services: _.set({}, name, {
          image: this.buildTag,
          environment,
          labels,
          logging,
          ports: ['80'],
        }),
      });
    };
  },
};
