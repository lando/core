'use strict';

const fs = require('fs');
const groupBy = require('lodash/groupBy');
const isObject = require('lodash/isPlainObject');
const os = require('os');
const merge = require('lodash/merge');
const path = require('path');

const {generateDockerFileFromArray} = require('dockerfile-generator/lib/dockerGenerator');
const {nanoid} = require('nanoid');

// @TODO: build steps with user-4 sytnax? test a hyphened group
// @TODO: build steps via group
// @TODO: set USER keyword in instructions
// comments for groups and things?

// @TODO: some mechanism for adding the sources into copy commands?
// @TODO: allow for add/copy eg url detection?

// @TODO: revisti networks/volumes
// @TODO: add debugger?
// @TODO: add stages

class ComposeServiceV4 {
  #data

  #init() {
    return {
      compose: [],
      groups: {
        default: {
          description: 'A default general purpose build group around which other groups can be added',
          weight: 1000,
          user: 'root',
        },
      },
      image: undefined,
      sources: [],
      stages: {
        default: 'image',
        image: 'Instructions to help generate an image',
      },
      steps: [],
    };
  }

  constructor(id, {app, appRoot, config, context, lando, name, tag, type} = {}) {
    // set top level required stuff
    this.id = id;
    this.config = config;
    this.context = context || path.join(os.tmpdir(), nanoid(), id);
    this.dockerfile = path.join(context, 'Dockerfile');
    this.name = name;
    this.type = type;
    this.appRoot = appRoot;
    this.tag = tag || nanoid();

    // @TODO: add needed validation for above things?

    // makre sure the build context dir exists
    fs.mkdirSync(this.context, {recursive: true});
    // @TODO: error handling on props?

    // initialize our private data
    // @TODO: provide a way to start with a different start state?
    this.#data = this.#init();

    // if this is a "_compose" service eg is being called directly and not via inheritance then we can assume
    // that config is lando-compose data and can/should be added directly
    if (type === '_compose') this.addServiceData(config);

    // @TODO: how is info handled here?
    this.info = config.info ?? {};
  }

  // this handles our changes to docker-composes "image" key
  // @TODO: helper methods to add particular parts of build data eg image, files, steps, groups, etc
  addBuildData(data) {
    // make sure data is in object format if its a string then we assume it sets the "dockerfile" value
    if (typeof data === 'string') data = {dockerfile: data};
    // now pass the dockerfile stuff into image parsing
    this.setImage(data.dockerfile);
    // if we have context data then lets pass that in as well
    if (data.context) this.addContext(data.context);
    // if we have groups data then
    if (data.groups) this.addGroups(data.groups);
    // handle steps data
    if (data.steps) this.addSteps(data.steps);
  }

  // just pushes the compose data directly into our thing
  addComposeData(data = {}) {
    this.#data.compose.push(data);
  }

  // adds files/dirs to the build context
  addContext(context) {
    // if we have context info as a string then lets translate into an array
    if (context && typeof context === 'string') context = [context];
    // if we have an array of context data then lets normalize it
    if (context && context.length > 0) {
      this.#data.sources.push(context.map(file => {
        // file is a string with src par
        if (typeof file === 'string' && file.split(':').length === 1) file = {src: file, dest: file};
        // file is a string with src and dest parts
        if (typeof file === 'string' && file.split(':').length === 2) file = {src: file.split(':')[0], dest: file.split(':')[1]}; // eslint-disable-line max-len
        // file is an object with src key
        if (isObject(file) && file.src) file.source = file.src;
        // file is an object with dest key
        if (isObject(file) && file.dest) file.destination = file.dest;
        // remove extraneous keys
        if (isObject(file) && file.src) delete file.src;
        if (isObject(file) && file.dest) delete file.dest;
        // handle relative source paths
        if (!path.isAbsolute(file.source)) file.source = path.resolve(this.appRoot, file.source);

        // return normalized data
        return file;
      }));
    }
  }

  // add build groups to the service
  addGroups(groups) {
    // start by making groups into an array if we can
    if (isObject(groups) && !Array.isArray(groups)) groups = [groups];

    // loop through the groups and merge them in
    if (groups && groups.length > 0) {
      groups.map(group => {
        // extrapolate short form first, if one key and it isnt id or name then assume a id weight pair
        if (Object.keys(group).length === 1 && !group.id && !group.name) {
          group = {id: Object.keys(group)[0], weight: group[Object.keys(group)[0]]};
        }

        // merge in
        this.#data.groups = merge({}, this.#data.groups, {[group.id || group.name]: {
          description: group.description || `Build group: ${group.id || group.name}`,
          weight: group.weight || this.#data.groups.default.weight || 1000,
          stage: group.stage || this.#data.stages.default || 'image',
          user: group.user || 'root',
        }});
      });
    }
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

  addSteps(steps) {
    // start by making groups into an array if we can
    if (isObject(steps) && !Array.isArray(steps)) steps = [steps];

    // then loop through and do what we need to do
    if (steps && steps.length > 0) {
      steps.map(step => {
        // handle group name overrides first eg break up into group|user|offset
        if (step.group && this.matchGroup(step.group) && this.getGroupOverrides(step.group)) {
          step = merge({}, step, this.getGroupOverrides(step.group));
        }

        // if no group or a group we cannot match then assume the default group
        // @TODO: debug in case we could not find the build group?
        if (!step.group || !this.matchGroup(step.group)) step.group = 'default';

        // we should have stnadardized groups at this point so we can rebase on those things in as well
        step = merge({}, {stage: this.#data.stages.default, weight: 1000}, this.#data.groups[step.group], step);

        // now lets modify the weight by the offset if we have one
        if (step.offset && Number(step.offset)) step.weight = step.weight + step.offset;

        // and finally lets rewrite the group for better instruction grouping
        step.group = `${step.group}-${step.weight}-${step.user}`;

        // push
        this.#data.steps.push(step);
      });
    }
  }

  getSteps(stage) {
    // @TODO: validate stage?

    // if we have a stage then filter by that
    if (stage) return this.#data.steps.filter(step => step.stage === stage);
    // otherwise return the whole thing
    return this.#data.steps;
  }

  // gets group overrides or returns false if there are none
  getGroupOverrides(group) {
    // break the group into parts
    const parts = group.replace(`${this.matchGroup(group)}`, '').split('-');
    // there will always be a leading '' element so dump it
    parts.shift();

    // if we have nothing then lets return false at this point
    if (parts.length === 0) return false;

    // if not then lets try to parse parts into a step obkect we can merge in
    const step = {group: this.matchGroup(group), offset: 0};

    // start by trying to grab the first integer number we find and assume this is the offset
    // @TODO: this means that user overrides MUST be passed in as non-castable strings eg usernames not uids
    if (parts.find(part => Number(part))) {
      step.offset = parts.splice(parts.indexOf(parts.find(part => Number(part))), 1)[0] * 1;
    }

    // now lets see if we can find a weight direction, we really only need to check for before since after is the default
    if (parts.find(part => part === 'before')) step.offset = step.offset * -1;

    // lets make sure we remove both "before" and "after" cause whatever is left is the user
    if (parts.indexOf('before') > -1) parts.splice(parts.indexOf('before'), 1);
    if (parts.indexOf('after') > -1) parts.splice(parts.indexOf('after'), 1);
    step.user = parts.join('-') || 'root';

    // return
    return step;
  }

  generateImageFiles() {
    // start with instructions that are sorted and grouped
    const steps = groupBy(this.getSteps('image').sort((a, b) => a.weight - b.weight), 'group');

    // now iterate through and translate into blocks of docker instructions with user and comments set
    for (const [group, data] of Object.entries(steps)) {
      // user should be consistent across data so just grab the first one
      const user = data[0].user;
      // reset data to array of instructions
      steps[group] = data
        .map(data => data.instructions)
        .map(data => Array.isArray(data) ? generateDockerFileFromArray(data) : data);
      // prefix user and comment data
      steps[group].unshift(`USER ${user}\n`);
      steps[group].unshift(`# ${group}\n`);
      steps[group] = steps[group].join('');
    }

    // we should have raw instructions data now
    const instructions = Object.values(steps);
    // unshift whatever we end up with in #data.from to the front of the instructions
    instructions.unshift(this.#data.image);
    // map instructions to dockerfile content
    const content = instructions.join('\n');
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

  // match group, if data starts with one of the groups then return that
  matchGroup(data) {
    return Object.keys(this.#data.groups).find(group => data.startsWith(group));
  }

  // sets the image for the service
  setImage(image) {
    // if the data is raw dockerfile instructions then dump it to a file and set to that file
    if (image.split('\n').length > 1) {
      const content = image;
      image = path.join(require('os').tmpdir(), nanoid(), 'Dockerfile');
      fs.mkdirSync(path.dirname(image), {recursive: true});
      fs.writeFileSync(image, content);
    }

    // if dockerfile is not an absolute path then test it with the approot as a base
    if (!path.isAbsolute(image) && fs.existsSync(path.resolve(this.appRoot, image))) {
      image = path.resolve(this.appRoot, image);
    }

    // at this point the dockerfile should either be a path to a dockerfile or a registry image
    // for the former save the raw dockerfile instructions as a string
    if (fs.existsSync(image)) this.#data.image = fs.readFileSync(image, 'utf8');
    // for the latter set the baseImage
    else this.#data.image = generateDockerFileFromArray([{from: {baseImage: image}}]);
  }
};

module.exports = ComposeServiceV4;
