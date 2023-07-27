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
      const product = _.get(app, '_lando.config.product', 'lando');
      // and some other generic properties
      const {name, image, type, version} = config;
      // ensure we have a build context directory
      const buildContextPath = path.join(app.v4._dir, 'build-contexts', id);
      fs.mkdirSync(buildContextPath, {recursive: true});

      // @TODO: some mechanism to parse lando dockerfile instructions into dockerfile-generator ones?
      // @TODO: data should contain the lando format dockerfile metadata?
      // lets start to compute the build context
      buildContext.context = buildContextPath;
      buildContext.data = buildContext.data || [];
      buildContext.dockerfile = path.join(buildContextPath, 'Dockerfile');
      buildContext.dockerfileInline = '';
      buildContext.id = id;
      buildContext.name = name;
      buildContext.service = name;
      buildContext.tag = `${product}/${app.name}-${name}-${app.id}`;
      // buildContext.sources = [path.resolve(__dirname, '..', 'scripts', 'test.sh')];

      // if we have an image that is a string then set the base image
      if (typeof image === 'string') buildContext.data.unshift({from: {baseImage: image}});
      // or if we have a path to a dockerfile load its contents
      else if (_.has(image, 'dockerfile')) buildContext.dockerfileInline = fs.readFileSync(image.dockerfile, 'utf8');

      // POC adding a file to the build context
      // moveConfig(path.resolve(__dirname, '..', 'scripts'), buildContext.context);
      // // POC using that file
      // // just hardcode something here
      // buildContext.data.push({
      //   comment: 'copy test.sh', copy: {'test.sh': '/test.sh'},
      //   comment: 'run test.sh', run: ['bash', '-c', 'chmod +x /test.sh && /test.sh'],
      // });

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

      // run buildContext.data through some helper function that translates into generateDockerFileFromArray format
      // and writes the dockerfile and returns its patth
      // @TODO: try/catch
      // buildContext.dockerfile = dumpSomething(buildContext.data, buildContext.path/Dockerifle);

      // generate the dockerfile and dump it
      // @TODO: make this a bit prettier?
      fs.writeFileSync(
        buildContext.dockerfile,
        `${buildContext.dockerfileInline}${generateDockerFileFromArray(buildContext.data)}`,
      );
      // @TODO: some error if there is no from

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
      compose.push({
        services: _.set({}, name, {
          image: buildContext.tag,
          environment,
          labels,
          logging,
          ports: ['80'],
        }),
      });

      // Pass it down
      super(id, info, buildContext, ...compose);
    };
  },
};
