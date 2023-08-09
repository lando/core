'use strict';

const fs = require('fs');
const groupBy = require('lodash/groupBy');
const isObject = require('lodash/isPlainObject');
const os = require('os');
const merge = require('lodash/merge');
const path = require('path');

const {generateDockerFileFromArray} = require('dockerfile-generator/lib/dockerGenerator');
const {nanoid} = require('nanoid');

// @TODO: should this be a class method of some kind? util? keep here?
const getMountMatches = (dir, volumes = []) => volumes
  // filter out non string bind mounts
  .filter(volume => volume.split(':').length === 2)
  // parse into object format
  .map(volume => ({source: volume.split(':')[0], target: volume.split(':')[1]}))
  // translate relative paths
  .map(volume => ({
    source: !path.isAbsolute(volume.source) ? path.resolve(dir, volume.source) : volume.source,
    target: volume.target,
  }))
  // filter sources that dont exist and are not the appRoot
  .filter(volume => fs.existsSync(volume.source) && volume.source === dir)
  // map to the target
  .map(volume => volume.target);

class ComposeServiceV4 {
  #data

  static debug = require('debug')('lando-compose-v4');

  #init() {
    return {
      compose: [],
      groups: {
        context: {
          description: 'A group for adding and copying sources to the image',
          weight: 0,
          user: 'root',
        },
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

  constructor(id, {
    app,
    appMount,
    lando,
    appRoot = path.join(os.tmpdir(), nanoid(), id),
    context = path.join(os.tmpdir(), nanoid(), id),
    config = {},
    debug = ComposeServiceV4.debug,
    name = id,
    tag = nanoid(),
    type = '_compose',
  } = {}) {
    // set top level required stuff
    this.id = id;
    this.appMount = appMount;
    this.appRoot = appRoot;
    this.config = config;
    this.context = context;
    this.debug = debug;
    this.name = name || id;
    this.type = type;
    this.tag = tag;
    this.dockerfile = path.join(context, 'Dockerfile');
    // @TODO: add needed validation for above things?
    // @TODO: error handling on props?

    // makre sure the build context dir exists
    fs.mkdirSync(this.context, {recursive: true});

    // initialize our private data
    // @TODO: provide a way to start with a different start state?
    this.#data = this.#init();

    // if this is a "_compose" service eg is being called directly and not via inheritance then we can assume
    // that config is lando-compose data and can/should be added directly
    if (type === '_compose') this.addServiceData(config);

    // if we do not have an appmount yet and we have volumes information then try to infer it
    if (!this.appMount && this.config && this.config.volumes && this.config.volumes.length > 0) {
      // try to get some possible app mounts
      const appMounts = getMountMatches(this.appRoot, this.config.volumes);
      // set appmount to the last found appMount
      this.appMount = appMounts.pop();
      // debug
      this.debug('autoset appmount to %o, did not select %o', this.appMount, appMounts);
    }

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
    this.debug('%o added top level compose data %o', this.id, data);
  }

  // adds files/dirs to the build context
  addContext(context, group = 'context') {
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
        // if source is actually a url then lets address that
        try {
          file.url = new URL(file.source).href;
          delete file.source;
        } catch {}
        // at this point we need to make sure a desintation is set
        if (!file.destination && file.source) file.destination = file.source;
        if (!file.destination && file.url) file.destination = new URL(file.url).pathname;
        // handle relative source paths
        if (file.source && !path.isAbsolute(file.source)) file.source = path.resolve(this.appRoot, file.source);

        // handle permissions
        if (file.perms) file.permissions = file.perms;

        // handle ownership
        if (file.user && !file.owner) file.owner = file.user;
        if (file.user && file.group) file.owner = `${file.user}:${file.group}`;

        // handle instructions
        if (!file.instructions) {
          file.instructions = file.url ? ['ADD'] : ['COPY'];
          if (file.owner) file.instructions.push(`--chown=${file.owner}`);
          // @TODO: below not possible until we have BuildKit support in docekrode
          // see: https://github.com/apocas/dockerode/issues/601
          // if (file.permissions) file.instructions.push(`--chmod=${file.permissions}`);
          file.instructions.push(file.url || file.destination);
          file.instructions.push(path.resolve('/', file.destination));
          file.instructions.push('\n');
          file.instructions = file.instructions.join(' ');
        }
        // ensure instructions are an array
        if (typeof file.instructions === 'string') file.instructions = [file.instructions];

        // remove extraneous keys
        if (isObject(file) && file.dest) delete file.dest;
        if (isObject(file) && file.group) delete file.group;
        if (isObject(file) && file.perms) delete file.perms;
        if (isObject(file) && file.src) delete file.src;
        if (isObject(file) && file.user) delete file.user;

        // should be ready for all the things eg pushing as a build step
        if (group) this.addSteps({group, instructions: file.instructions.join('\n')});

        // return normalized data
        this.debug('%o added %o to the build context', this.id, file);
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

        this.debug('%o added build group %o', this.id, group);
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

    // handle any appropriate path normalization for volumes
    // @TODO: do we need to normalize other things?
    // @NOTE: this normalization ONLY applies here, not in the generic addComposeData
    if (compose.volumes && Array.isArray(compose.volumes)) {
      compose.volumes = compose.volumes.map(volume => {
        // if volume is a one part string then just return so we dont have to handle it downstream
        if (typeof volume === 'string' && volume.split(':').length === 1) return volume;

        // if volumes is a string with two colon-separated parts then do stuff
        if (typeof volume === 'string' && volume.split(':').length === 2) {
          volume = {target: volume.split(':')[1], source: volume.split(':')[0]};
        }

        // if source is not an absolute path that exists relateive to appRoot then set as bind
        if (!path.isAbsolute(volume.source) && fs.existsSync(path.join(this.appRoot, volume.source))) {
          volume.source = path.join(this.appRoot, volume.source);
        }

        // if target exists then bind otherwise vol
        volume.type = fs.existsSync(volume.source) ? 'bind' : 'volume';

        // return
        return volume;
      });
    }

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

        // log
        this.debug('%o added build step %o', this.id, step);

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
      sources: this.#data.sources.flat(Number.POSITIVE_INFINITY).filter(Boolean).filter(source => !source.url),
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
      data: this.#data.compose.map(element => merge({}, element)),
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
    // log
    this.debug('%o set base image to %o', this.id, this.#data.image);
  }
};

module.exports = ComposeServiceV4;