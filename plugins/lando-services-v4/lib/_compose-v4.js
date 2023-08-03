'use strict';

const fs = require('fs');
const os = require('os');
const merge = require('lodash/merge');
const path = require('path');

const {generateDockerFileFromArray} = require('dockerfile-generator/lib/dockerGenerator');
const {nanoid} = require('nanoid');

class ComposeServiceV4 {
  #data

  #init() {
    return {
      compose: [],
      groups: [],
      image: undefined,
      sources: [],
      stages: [],
      steps: [],
    };
  }

  constructor(id, {app, appRoot, config, context, lando, name, tag, type} = {}) {
    // @TODO: image build steps/stages//groups

    // @TODO: revisti networks/volumes
    // @TODO: add debugger?

    // set top level required stuff
    this.id = id;
    this.config = config;
    this.context = context || path.join(os.tmpdir(), nanoid(), id);
    this.dockerfile = path.join(context, 'Dockerfile');
    this.name = name;
    this.type = type;
    this.appRoot = appRoot;
    this.tag = tag || nanoid();

    // makre sure the build context dir exists
    fs.mkdirSync(this.context, {recursive: true});
    // @TODO: error handling on props?

    // initialize our private data
    this.#data = this.#init();

    // if this is a "_compose" service eg is being called directly and not via inheritance then we can assume
    // that config is lando-compose data and can/should be added directly
    if (type === '_compose') this.addServiceData(config);

    // @TODO: how is info handled here?
    this.info = config.info ?? {};
  }

  // this handles our changes to docker-composes "image" key
  addBuildData(data) {
    // make sure data is in object format if its a string then we assume it sets the "dockerfile" value
    if (typeof data === 'string') data = {dockerfile: data};

    // if the data is raw dockerfile instructions then dump it to a file and set to that file
    if (data.dockerfile.split('\n').length > 1) {
      const content = data.dockerfile;
      data.dockerfile = path.join(require('os').tmpdir(), nanoid(), 'Dockerfile');
      fs.mkdirSync(path.dirname(data.dockerfile), {recursive: true});
      fs.writeFileSync(data.dockerfile, content);
    }

    // if dockerfile is not an absolute path then test it with the approot as a base
    if (!path.isAbsolute(data.dockerfile) && fs.existsSync(path.resolve(this.appRoot, data.dockerfile))) {
      data.dockerfile = path.resolve(this.appRoot, data.dockerfile);
    }

    // at this point the dockerfile should either be a path to a dockerfile or a registry image
    // for the former save the raw dockerfile instructions as a string
    if (fs.existsSync(data.dockerfile)) this.#data.image = fs.readFileSync(data.dockerfile, 'utf8');
    // for the latter set the baseImage
    else this.#data.image = {from: {baseImage: data.dockerfile}};

    // if we have context info as a string then lets translate into an array
    if (data.context && typeof data.context === 'string') data.context = [data.context];
    // if we have an array of context data then lets normalize it
    if (data.context && data.context.length > 0) {
      this.#data.sources.push(data.context.map(file => {
        // file is a string with src par
        if (typeof file === 'string' && file.split(':').length === 1) file = {src: file, dest: file};
        // file is a string with src and dest parts
        if (typeof file === 'string' && file.split(':').length === 2) file = {src: file.split(':')[0], dest: file.split(':')[1]}; // eslint-disable-line max-len
        // file is an object with src key
        if (typeof file === 'object' && file.src) file.source = file.src;
        // file is an object with dest key
        if (typeof file === 'object' && file.dest) file.destination = file.dest;

        // remove extraneous keys
        if (typeof file === 'object' && file.src) delete file.src;
        if (typeof file === 'object' && file.dest) delete file.dest;

        // handle relative source paths
        if (!path.isAbsolute(file.source)) file.source = path.resolve(this.appRoot, file.source);

        // return normalized data
        return file;
      }));
    }
  }

  // just pushes the compose data directly into our thing
  addComposeData(data = {}) {
    this.#data.compose.push(data);
  }

  // lando runs a small superset of docker-compose that augments the image key so it can contain dockerfile data
  addServiceData(data = {}) {
    // if we have build data instead of image data then swap the keys
    if (data.build && !data.image) data.image = data.build;
    // if data has image data then we first need to send that data elsewhere and remove it from the compose data
    if (data.image) this.addBuildData(data.image);
    // ensure we are not passing in the image or build key
    const {build, image, ...compose} = data; // eslint-disable-line
    // add the data
    this.#data.compose.push({services: {[this.id]: compose}});
  }

  getSteps(stage) {
    // @TODO: validate stage?

    // if we have a stage then filter by that
    if (stage) return this.#data.steps.filter(step => step.stage === stage);
    // otherwise return the whole thing
    return this.#data.steps;
  }

  generateImageFiles() {
    // @TODO: sort/filter buildContext.data and return an array of dockerfile instructions?
    // @TODO: run buildContext.data through some helper function that translates into generateDockerFileFromArray format
    // @TODO: method to get build steps of a certain stage?
    const instructions = this.getSteps('image');

    // unshift whatever we end up with in #data.from to the front of the instructions
    instructions.unshift(this.#data.image);

    // map instructions to dockerfile content
    const content = instructions
      .map(partial => typeof partial === 'object' ? generateDockerFileFromArray([partial]) : partial)
      .join('\n');
    // @TODO: generic dockerfile validation/linting/etc?or error

    // write the dockerfile
    fs.writeFileSync(this.dockerfile, content);

    // return the build context
    return {
      id: this.id,
      context: this.context,
      dockerfile: this.dockerfile,
      sources: this.#data.sources.flat(Number.POSITIVE_INFINITY).filter(Boolean),
      tag: this.tag,
    };
  }

  generateOrchestorFiles() {
    // add the final compose data with the updated image tag
    this.addComposeData({services: {[this.id]: {image: this.tag}}});

    // return it all
    return {
      id: this.id,
      info: this.info,
      data: this.#data.compose.map(element => merge({}, element, {version: '3.6'})),
    };
  }
};

module.exports = ComposeServiceV4;
