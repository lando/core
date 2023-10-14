'use strict';

const fs = require('fs');
const groupBy = require('lodash/groupBy');
const isObject = require('lodash/isPlainObject');
const os = require('os');
const merge = require('lodash/merge');
const path = require('path');

const {generateDockerFileFromArray} = require('dockerfile-generator/lib/dockerGenerator');
const {nanoid} = require('nanoid');

// @TODO: should these be methods as well? static or otherwise?
const getMountMatches = require('../utils/get-mount-matches');
const hasInstructions = require('../utils/has-instructions');

class L337ServiceV4 {
  #data

  static debug = require('debug')('l337-service-v4');
  static bengineConfig = {};

  static getBengine(config = L337ServiceV4.bengineConfig, {debug = L337ServiceV4.debug} = {}) {
    const DockerEngine = require('./docker-engine');
    return new DockerEngine(config, {debug});
  }

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
      imageInstructions: undefined,
      imageFileContext: undefined,
      sources: [],
      stages: {
        default: 'image',
        image: 'Instructions to help generate an image',
      },
      steps: [],
    };
  }

  constructor(id, {
    appRoot = path.join(os.tmpdir(), nanoid(), id),
    context = path.join(os.tmpdir(), nanoid(), id),
    config = {},
    debug = L337ServiceV4.debug,
    groups = {},
    info = {},
    name = id,
    primary = false,
    stages = {},
    tag = nanoid(),
    type = 'l337',
    legacy = {
      meUser = 'www-data',
      moreHttpPorts = [],
      sport = '443',
    } = {},
  } = {}) {
    // set top level required stuff
    this.id = id;
    this.appRoot = appRoot;
    this.config = config;
    this.context = context;
    this.debug = debug;
    this.name = name || id;
    this.primary = primary;
    this.type = type;
    this.tag = tag;

    this.imagefile = path.join(context, 'Imagefile');
    // @TODO: add needed validation for above things?
    // @TODO: error handling on props?

    // makre sure the build context dir exists
    fs.mkdirSync(this.context, {recursive: true});

    // initialize our private data
    this.#data = merge(this.#init(), {groups}, {stages});

    // rework info based on whatever is passed in
    this.info = merge({}, {service: id, api: 4, lastBuild: 'never', primary, type}, info);

    // add in the l337 spec config
    this.addServiceData(config);

    // handle legacy and deprecated settings in lando-v4 and above services
    this.addComposeData({services: {[this.id]: {labels: {
      'io.lando.http-ports': ['80', '443'].concat(legacy.moreHttpPorts).join(','),
      'io.lando.https-ports': ['443'].concat([legacy.sport]).join(','),
      },
    }}});

    // handle legacy "meUser" setting
    this.info.user = legacy.meUser;

    // if we do not have an appmount yet and we have volumes information then try to infer it
    if (this.config && this.config.volumes && this.config.volumes.length > 0) {
      // try to get some possible app mounts
      const appMounts = getMountMatches(this.appRoot, this.config.volumes);
      // if we have one then set it
      if (appMounts.length > 0) {
        this.appMount = appMounts.pop();
        this.info.appMount = this.appMount;
      }
      // debug
      this.debug('%o autoset appmount to %o, did not select %o', this.id, this.appMount, appMounts);
    }
  }

  // this handles our "changes" to docker-composes "build" key but really it just processes it and passes it through
  addBuildData(data) {
    // if data is a string then its the context and it should be
    if (typeof data === 'string') data = {context: data};
    // if no context then set to app root
    if (!data.context) data.context = this.appRoot;
    // ensure dockerfile is set
    if (!data.dockerfile) data.dockerfile = 'Dockerfile';
    // now pass the imagefile stuff into image parsing
    this.setBaseImage(path.join(data.context, data.dockerfile), data);
    // make sure we are adding the dockerfile context directly as a source so COPY/ADD instructions work
    // @NOTE: we are not adding a "context" because that also injects dockerfile instructions which we might already have
    this.#data.sources.push(({source: data.context, destination: '.'}));
  }

  // this handles our changes to docker-composes "image" key
  // @TODO: helper methods to add particular parts of build data eg image, files, steps, groups, etc
  addImageData(data) {
    // make sure data is in object format if its a string then we assume it sets the "imagefile" value
    if (typeof data === 'string') data = {imagefile: data};
    // map dockerfile key to image key if it is set and imagefile isnt
    if (!data.imagefile && data.dockerfile) data.imagefile = data.dockerfile;
    // now pass the imagefile stuff into image parsing
    this.setBaseImage(data.imagefile);
    // if the imageInstructions include COPY/ADD then make sure we are adding the dockerfile context directly as a
    // source so those instructions work
    // @NOTE: we are not adding a "context" because if this passes we have the instructions already and just need to make
    // sure the files exists
    // @TODO: move this to a static method?
    if (hasInstructions(this.#data.imageInstructions, ['COPY', 'ADD']) && this.#data.imageFileContext) {
      this.#data.sources.push(({source: this.#data.imageFileContext, destination: '.'}));
    }
    // if we have context data then lets pass that in as well
    if (data.context) this.addContext(data.context);
    // if we have groups data then
    if (data.groups) this.addGroups(data.groups);
    // handle steps data
    if (data.steps) this.addSteps(data.steps);
    // if we have a custom tag then set that
    if (data.tag) this.tag = data.tag;
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
          file.instructions = file.instructions.join(' ');
        }

        // ensure instructions are an array
        if (typeof file.instructions === 'string') file.instructions = [`${file.instructions}`];

        // remove extraneous keys
        if (isObject(file) && file.dest) delete file.dest;
        if (isObject(file) && file.group) delete file.group;
        if (isObject(file) && file.perms) delete file.perms;
        if (isObject(file) && file.src) delete file.src;
        if (isObject(file) && file.user) delete file.user;

        // should be ready for all the things eg pushing as a build step
        if (group) this.addSteps({group, instructions: file.instructions.join('\n'), contexted: true});

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

  // lando runs a small superset of docker-compose that augments the image key so it can contain imagefile data
  addServiceData(data = {}) {
    // if both image and build are set then set the tag to the image
    if (data.build && data.image) this.tag = data.image;
    // if build is set then prefer that
    if (data.build) this.addBuildData(data.build);
    // otherwise do image
    else if (data.image) this.addImageData(data.image);

    // ensure we are not passing in build/image as we handle those above
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
          volume = {source: volume.split(':')[0], target: volume.split(':')[1]};
        }

        // if volumes is a string with three colon-separated parts then do stuff
        if (typeof volume === 'string' && volume.split(':').length === 3) {
          volume = {
            source: volume.split(':')[0],
            target: volume.split(':')[1],
            read_only: volume.split(':')[2] === 'ro',
          };
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
        if (step.group && this.getOverrideGroup(step.group) && this.getGroupOverrides(step.group)) {
          step = merge({}, step, this.getGroupOverrides(step.group));
        }

        // if no group at this point assume default group
        if (!step.group) step.group = 'default';
        // at this point group should be defined and override syntax broken apart, if the step uses an unknown group
        // then log and set it to the default group
        if (this.#data.groups[step.group] === undefined) {
          this.debug('%o does not reference a defined group, using %o group instead', step.group, 'default');
          step.group = 'default';
        }

        // we should have stnadardized groups at this point so we can rebase on defaults as
        step = merge({},
          {stage: this.#data.stages.default},
          {weight: this.#data.groups.default.weight, user: this.#data.groups.default.user},
          this.#data.groups[step.group],
          step,
        );
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

  // build the image
  async buildImage() {
    // get build func
    const bengine = L337ServiceV4.getBengine(L337ServiceV4.bengineConfig, {debug: this.debug});
    // separate out imagefile and context
    const {imagefile, ...context} = this.generateBuildContext();

    try {
      const success = await bengine.build(imagefile, context);
      // augment the success info
      success.context = {imagefile, ...context};
      // add the final compose data with the updated image tag on success
      // @NOTE: ideally its sufficient for this to happen ONLY here but in v3 its not
      this.addComposeData({services: {[context.id]: {image: context.tag}}});
      // set the image into the info
      this.info.image = imagefile;
      this.info.tag = context.tag;

      this.debug('built image %o successfully from %o', context.id, imagefile);
      return success;

    // failure
    } catch (e) {
      e.context = {imagefile, ...context};
      this.debug('image %o build failed with error %o', context.id, e);
      this.debug('image %o build failed, setting it back to use base image', context.id, this.#data.image);

      // reset the info
      this.info.image = this.#data.image;

      throw e;
    }
  }

  generateBuildContext() {
    // get dockerfile validator
    // const {validate} = require('dockerfile-utils');

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

      // if we have any rogue uncontexted COPY/ instructions then we need to add appropriate sources to make sure
      // it all works seemlessly
      if (steps[group]
        .map((step, index) => ({index, step, contexted: data[index].contexted === true}))
        .filter(step => hasInstructions(step.step, ['COPY', 'ADD']))
        .map(step => step.contexted)
        .reduce((contexted, step) => contexted || !step, false)) {
          this.#data.sources.push(({source: this.#data.imageFileContext || this.appRoot, destination: '.'}));
        }

      // attempt to normalize newling usage mostly for aesthetic considerations
      steps[group] = steps[group]
        .map(instructions => instructions.split('\n').filter(instruction => instruction && instruction !== ''))
        .flat(Number.POSITIVE_INFINITY);

      // prefix user and comment data and some helpful envvars
      steps[group].unshift(`USER ${user}`);
      steps[group].unshift(`ENV LANDO_IMAGE_GROUP ${group}`);
      steps[group].unshift(`ENV LANDO_IMAGE_USER ${user}`);
      steps[group].unshift(`# group: ${group}`);
      // and add a newline for readability
      steps[group].push('');
      // and then finally put it all together
      steps[group] = steps[group].join('\n');
    }

    // we should have raw instructions data now
    const instructions = Object.values(steps);
    // unshift whatever we end up with in #data.from to the front of the instructions
    instructions.unshift(this.#data.imageInstructions);
    instructions.unshift(`# build-context: ${this.context}`);
    instructions.unshift(`# service: ${this.name}`);
    instructions.unshift('# Imagefile generated by Lando.');
    // map instructions to imagefile content
    const content = instructions.join('\n');

    // attempt to validate the content
    // console.log(content);
    // console.log(validate(content));
    // @TODO: generic imagefile validation/linting/etc?or error
    // throw new Error('NO NO NO')

    // write the imagefile
    fs.writeFileSync(this.imagefile, content);

    // return the build context
    return {
      id: this.id,
      context: this.context,
      imagefile: this.imagefile,
      sources: this.#data.sources.flat(Number.POSITIVE_INFINITY).filter(Boolean).filter(source => !source.url),
      tag: this.tag,
    };
  }

  generateOrchestorFiles() {
    return {
      id: this.id,
      info: this.info,
      data: this.#data.compose.map(element => merge({}, element)),
    };
  }

  getSteps(stage) {
    // if we have a stage then filter by that
    if (stage) return this.#data.steps.filter(step => step.stage === stage);
    // otherwise return the whole thing
    return this.#data.steps;
  }

  // gets group overrides or returns false if there are none
  getGroupOverrides(group) {
    // break the group into parts
    const parts = group.replace(`${this.getOverrideGroup(group)}`, '').split('-');
    // there will always be a leading '' element so dump it
    parts.shift();

    // if we have nothing then lets return false at this point
    if (parts.length === 0) return false;

    // if not then lets try to parse parts into a step obkect we can merge in
    const step = {group: this.getOverrideGroup(group), offset: 0};

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

  // returns the group the override is targeting or false if not really an override
  getOverrideGroup(data) {
    // first order the groups by longest string and filter out any that dont start with data
    // this should ensure we end up with an ordered by closest match list
    const candidates = Object.keys(this.#data.groups)
      .sort((a, b) => b.length - a.length)
      .filter(group => data.startsWith(group));

    // if there is a closest match that is not the group itself then its an override otherwise fise
    return candidates.length > 0 && candidates[0] !== data ? candidates[0] : false;
  }

  // sets the base image for the service
  setBaseImage(image, buildArgs = {}) {
    // if the data is raw imagefile instructions then dump it to a file and set to that file
    if (image.split('\n').length > 1) {
      const content = image;
      image = path.join(require('os').tmpdir(), nanoid(), 'Imagefile');
      fs.mkdirSync(path.dirname(image), {recursive: true});
      fs.writeFileSync(image, content);
      this.#data.imageFileContext = this.appRoot;
    }

    // if imagefile is not an absolute path then test it with the approot as a base
    if (!path.isAbsolute(image) && fs.existsSync(path.resolve(this.appRoot, image))) {
      image = path.resolve(this.appRoot, image);
      this.#data.imageFileContext = path.dirname(image);
    }

    // at this point we have either a dockerfile or a tagged image, lets set the base first
    this.#data.image = image;

    // and then generate the image instructions and set info
    this.#data.imageInstructions = fs.existsSync(image)
      ? fs.readFileSync(image, 'utf8') : generateDockerFileFromArray([{from: {baseImage: image}}]);
    this.info.image = image;

    // finally lets reset the relevant build key if applicable
    if (fs.existsSync(image)) {
      this.addComposeData({services: {[this.id]: {
        build: merge({}, buildArgs, {dockerfile: path.basename(image), context: path.dirname(image)}),
      }}});
    // or the image one if its that one
    } else this.addComposeData({services: {[this.id]: {image}}});

    // log
    this.debug('%o set base image to %o with instructions %o', this.id, this.#data.image, this.#data.imageInstructions);
  }
};

module.exports = L337ServiceV4;
