'use strict';

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  api: 4,
  name: 'lando',
  config: {
    pirog: 1,
  },
  parent: 'l337',
  builder: (parent, config) => class LandoServiceV4 extends parent {
    constructor(id, options, {app, lando} = {}) {
      // big problems:
      // 1. load order of docker-compose files? is it the opposite of what we do now?
      // 2. merging in all image provided data?
      // 3. top level networks and volumes?


      // @NOTE:
      // its just like v3 except that we are "adding" lando-format docker-compose stuff eg normal docker-compose
      // stuff except that image is the lando spec
      // this means that when we add(), add() needs to remove "image" and add to build context somehow?
      //
      // so docker compose stuff can override normally but we need to figure out how to merge image stuff?

      // mariadb -> type: mariadb:/my-dockerfile:11
      // -> load mariadb-11.js and set image: ./my-dpckerfile?

      // we dont set the final docker-compose image until we generate the files? so we ALWAYS remove the image key?
      // image logic exmaple:
      // mariadb adds data with an image set, top image data takes the from? everything else is pushed so the top of the
      // chain adds the last run instructions?

      // how does a plugin ad stuff?

      //

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

      console.log(config);

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
