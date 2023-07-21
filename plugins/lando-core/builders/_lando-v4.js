'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const {generateDockerFileFromArray} = require('dockerfile-generator/lib/dockerGenerator');

/*
 * The lowest level lando service, this is where a lot of the deep magic lives
 */
module.exports = {
  api: 4,
  name: '_lando',
  parent: '_compose',
  builder: parent => class LandoLandoV4 extends parent {
    constructor(id, config, buildContext = {}, ...compose) {
      // get that app from the config
      const app = config._app;
      // and some other generic properties
      const {name, type, version} = config;

      // lets just hardcode stuff for now
      buildContext.path = path.join(app.v4._dir, 'build-contexts', id);
      // ensure it exists
      fs.mkdirSync(buildContext.path, {recursive: true});

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

      // Add some info basics
      const info = {};
      // info.config = config;
      info.service = name;
      info.type = type;
      info.version = version;
      // info.meUser = meUser;
      // info.hasCerts = ssl;

      // @TODO: some mechanism to parse lando dockerfile instructions into dockerfile-generator ones?
      // @NOTE: DO NOT FORGET ABOUT generator.convertToJSON(inputDockerFile)
      // @TODO: data should contain the lando format dockerfile metadata?
      buildContext.dockerfile = path.join(buildContext.path, 'Dockerfile');
      buildContext.data = [
        {from: {baseImage: 'nginx'}},
        {comment: 'do shit', run: ['bash', '-c', 'apt-get update -y && apt-get install openssl -y']},
      ];
      buildContext.tag = 'vibes:1';

      // @TODO:
      // buildContext.sources =

      // run buildContext.data through some helper function that translates into generateDockerFileFromArray format
      // and writes the dockerfile and returns its patth
      // @TODO: try/catch
      // buildContext.dockerfile = dumpSomething(buildContext.data, buildContext.path/Dockerifle);
      fs.writeFileSync(buildContext.dockerfile, generateDockerFileFromArray(buildContext.data));

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
      const labels = {
        'dev.lando.api': 4,
      };

      // Set a reasonable log size
      const logging = {driver: 'json-file', options: {'max-file': '3', 'max-size': '10m'}};

      // basic docker compose file
      compose.push({
        services: _.set({}, name, {
          image: buildContext.tag,
          environment,
          labels,
          logging,
          ports: ['80:80'],
        }),
      });

      // Pass it down
      super(id, info, buildContext, ...compose);
    };
  },
};
