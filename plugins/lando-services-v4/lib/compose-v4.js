'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const {generateDockerFileFromArray} = require('dockerfile-generator/lib/dockerGenerator');

class ComposeServiceV4 {
  #buildContext;
  #composeData;

  constructor(id, config = {}) {
    // set top level required stuff
    this.id = id;
    this.app = config.app;
    this.image = config.image;
    this.name = config.name;
    this.type = config.type;
    this.tag = config.tag;
    this.version = config.version;

    this.buildDir = path.join(config.dir, 'build-contexts', id);
    this.buildTag = `${_.get(config, 'product', 'lando')}/${this.app}-${config.appId}-${this.name}`,
    // @TODO: error handling on above props?

    // and set the info and whole  config as well
    this.config = config;
    this.info = config.info ?? {};

    // set up the intial build context
    // POC adding a file to the build context
    // moveConfig(path.resolve(__dirname, '..', 'scripts'), buildContext.context);
    // // POC using that file
    // // just hardcode something here
    // buildContext.data.push({
    //   comment: 'copy test.sh', copy: {'test.sh': '/test.sh'},
    //   comment: 'run test.sh', run: ['bash', '-c', 'chmod +x /test.sh && /test.sh'],
    // });
    this.#buildContext = {
      context: this.buildDir,
      data: [],
      dockerfile: path.join(this.buildDir, 'Dockerfile'),
      dockerfileInline: undefined,
      id: this.id,
      name: this.name,
      service: this.name,
      sources: [],
      tag: this.buildTag,
    };
    fs.mkdirSync(this.#buildContext.context, {recursive: true});

    this.#composeData = [];
  }

  addComposeData(data) {
    // @TODO: error handling?
    this.#composeData.push(data);
  }

  generateImageFiles() {
    // if we have an image that is a string then set the base image
    if (typeof this.image === 'string') this.#buildContext.data.unshift({from: {baseImage: this.image}});
    // or if we have a path to a dockerfile load its contents
    else if (_.has(this, 'image.dockerfile')) {
      this.#buildContext.dockerfileInline = fs.readFileSync(this.image.dockerfile, 'utf8');
    }

    // @TODO: run buildContext.data through some helper function that translates into generateDockerFileFromArray format
    // and writes the dockerfile and returns its patth

    // translate buildContext data into an actual dockerfile
    const dockerfile = [generateDockerFileFromArray(this.#buildContext.data)];
    // prepend inline dockerfile content if we have it
    if (this.#buildContext.dockerfileInline) dockerfile.unshift(this.#buildContext.dockerfileInline);
    // @TODO: generic dockerfile validation/linting/etc?or error

    // generate the dockerfile and dump it
    fs.writeFileSync(this.#buildContext.dockerfile, dockerfile.join(''));
    // return the build context
    return this.#buildContext;
  }

  generateOrchestorFiles() {
    return {
      id: this.id,
      info: this.info,
      data: _(this.#composeData).map(element => _.merge({}, element, {version: '3.6'})).value(),
    };
  }
};

module.exports = ComposeServiceV4;
