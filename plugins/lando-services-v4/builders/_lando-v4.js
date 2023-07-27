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
  config: {
    pirog: 1,
  },
  parent: '_compose',
  builder: (parent, config) => class LandoLandoV4 extends parent {
    constructor(id, options, {app, lando} = {}) {
      // @TODO: merge in default values?
      super(id, _.merge(config, options));

      // and some other generic properties
      const {name, image, type, version} = config;

      // ensure we have a build context directory
      const buildContextPath = path.join(app.v4._dir, 'build-contexts', id);
      fs.mkdirSync(buildContextPath, {recursive: true});

      // @TODO: some mechanism to parse lando dockerfile instructions into dockerfile-generator ones?
      // @TODO: data should contain the lando format dockerfile metadata?
      // lets start to compute the build context
      this.buildContext.context = buildContextPath;
      this.buildContext.data = this.buildContext.data || [];
      this.buildContext.dockerfile = path.join(buildContextPath, 'Dockerfile');
      this.buildContext.dockerfileInline = '';
      this.buildContext.id = id;
      this.buildContext.name = name;
      this.buildContext.service = name;
      this.buildContext.tag = `${lando.config.product}/${app.name}-${name}-${app.id}`;
      // buildContext.sources = [path.resolve(__dirname, '..', 'scripts', 'test.sh')];

      // if we have an image that is a string then set the base image
      if (typeof image === 'string') this.buildContext.data.unshift({from: {baseImage: image}});
      // or if we have a path to a dockerfile load its contents
      else if (_.has(image, 'dockerfile')) {
        this.buildContext.dockerfileInline = fs.readFileSync(image.dockerfile, 'utf8');
      }

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
      // info.config = config;
      this.info.service = name;
      this.info.type = type;
      this.info.version = version;
      // info.meUser = meUser;
      // info.hasCerts = ssl;

      // run buildContext.data through some helper function that translates into generateDockerFileFromArray format
      // and writes the dockerfile and returns its patth
      // @TODO: try/catch
      // buildContext.dockerfile = dumpSomething(buildContext.data, buildContext.path/Dockerifle);

      // generate the dockerfile and dump it
      // @TODO: make this a bit prettier?
      fs.writeFileSync(
        this.buildContext.dockerfile,
        `${this.buildContext.dockerfileInline}${generateDockerFileFromArray(this.buildContext.data)}`,
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
      this.composeData.push({
        services: _.set({}, name, {
          image: this.buildContext.tag,
          environment,
          labels,
          logging,
          ports: ['80'],
        }),
      });
    };
  },
};
