'use strict';

const fs = require('fs');
const groupBy = require('lodash/groupBy');
const isObject = require('lodash/isPlainObject');
const isStringy = require('../utils/is-stringy');
const os = require('os');
const merge = require('lodash/merge');
const path = require('path');
const read = require('../utils/read-file');
const remove = require('../utils/remove');
const write = require('../utils/write-file');
const uniq = require('lodash/uniq');

const {generateDockerFileFromArray} = require('dockerfile-generator/lib/dockerGenerator');
const {nanoid} = require('nanoid');
const {EventEmitter} = require('events');

// set more appropirate lando limit
EventEmitter.setMaxListeners(64);

// @TODO: should these be methods as well? static or otherwise?
const getMountMatches = require('../utils/get-mount-matches');
const hasInstructions = require('../utils/has-instructions');
const toPosixPath = require('../utils/to-posix-path');

class L337ServiceV4 extends EventEmitter {
  #app
  #data
  #lando

  static debug = require('debug')('@lando/l337-service-v4');
  static bengineConfig = {};
  static builder = require('../utils/get-docker-x')();
  static orchestrator = require('../utils/get-compose-x')();

  static getBengine(config = L337ServiceV4.bengineConfig,
    {
      builder = L337ServiceV4.builder,
      debug = L337ServiceV4.debug,
      orchestrator = L337ServiceV4.orchestrator,
    } = {}) {
    const DockerEngine = require('./docker-engine');
    return new DockerEngine(config, {builder, debug, orchestrator});
  }

  #init() {
    return {
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
      info: {
        api: 4,
        state: {
          IMAGE: 'UNBUILT',
        },
      },
      sources: [],
      stages: {
        default: 'image',
        image: 'Instructions to help generate an image',
      },
      states: {
        IMAGE: 'UNBUILT',
      },
      steps: [],
      volumes: [],
    };
  }

  set info(data) {
    // reset state info
    if (data === undefined) data = {state: this.#data.states, tag: undefined};
    // merge
    this.#data.info = merge(this.#data.info, data);
    // if we have app.info then merge into that
    if (this.#app.info.find(service => service.service === this.id)) {
      merge(this.#app.info.find(service => service.service === this.id) ?? {}, data);
    }
    this.emit('state', this.#data.info);
    this.#app.v4.updateComposeCache();
  }

  get info() {
    return this.#data.info;
  }

  get _data() {
    return this.#data;
  }

  constructor(id, {
    appRoot = path.join(os.tmpdir(), project, 'app', id),
    // buildArgs = {},
    context = path.join(os.tmpdir(), project, 'build-contexts', id),
    config = {},
    debug = L337ServiceV4.debug,
    groups = {},
    info = {},
    name = id,
    primary = false,
    project = app.project,
    sshKeys = [],
    sshSocket = false,
    stages = {},
    states = {},
    tag = nanoid(),
    tlvolumes = {},
    tmpdir = path.join(os.tmpdir(), project, 'tmp', id),
    type = 'l337',
    user = undefined,
  } = {}, app, lando) {
    // instantiate ee immedately
    super();

    // set top level required stuff
    this.id = id;
    this.api = 'l337';
    this.appRoot = appRoot;
    this.buildkit = true;
    this.config = config;
    this.context = context;
    this.debug = debug.extend(id);
    this.name = name ?? id;
    this.primary = primary;
    this.project = project;
    this.sshKeys = sshKeys;
    this.sshSocket = sshSocket;
    this.tag = tag;
    this.tmpdir = tmpdir;
    this.type = type;

    this.imagefile = path.join(tmpdir, 'Imagefile');
    // @TODO: add needed validation for above things?
    // @TODO: error handling on props?

    // makre sure the build context dir exists
    fs.mkdirSync(this.context, {recursive: true});
    fs.mkdirSync(this.tmpdir, {recursive: true});

    // initialize our private data
    this.#app = app;
    this.#lando = lando;
    this.#data = merge(this.#init(), {groups}, {stages}, {states}, {volumes: Object.keys(tlvolumes)});

    // rework info based on whatever is passed in
    this.info = merge({}, {state: states}, {primary, service: id, type}, info);

    // do some special undocumented things to "ports"
    const {ports, http, https} = require('../utils/parse-v4-ports')(config.ports);

    // add in the l337 spec config
    this.addServiceData({
      ...config,
      extra_hosts: ['host.lando.internal:host-gateway'],
      ports,
    });
    this.addServiceData({ports});

    // handle legacy and deprecated settings in lando-v4 and above services
    this.addComposeData({services: {[this.id]: {labels: {
      'dev.lando.http-ports': http.join(','),
      'dev.lando.https-ports': https.join(','),
      },
    }}});

    // set user into info
    this.info = {user: user ?? config.user ?? 'root'};

    // if we do not have an appmount yet and we have volumes information then try to infer it
    if (this.config && this.config.volumes && this.config.volumes.length > 0) {
      // try to get some possible app mounts
      const appMounts = getMountMatches(this.appRoot, this.config.volumes);
      // if we have one then set it
      if (appMounts.length > 0) {
        this.appMount = appMounts.pop();
        this.info = {appMount: this.appMount};
      }
      // debug
      this.debug('%o autoset appmount to %o, did not select %o', this.id, this.appMount, appMounts);
    }
  }

  // passed in build args that can be used
  addBuildArgs(args) {
    // if args is an object lets make it into an array
    if (isObject(args)) args = Object.entries(args);

    // if args is a string then just arrayify it immediately
    if (typeof args === 'string') args = [args];

    // if we arent an array at this point something has gone amis so lets just set unset it and debug
    if (!Array.isArray(args)) {
      args = [];
      this.debug('build-args cannot be translated into an array so resetting to empty');
    }

    // we should def be an array at this point so lets standardize as best we can
    args = args
      .map(arg => typeof arg === 'string' ? arg.split('=') : arg)
      .filter(arg => arg !== null && arg !== undefined)
      .filter(([key]) => key !== null && key !== undefined)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ([key, String(value)]))
      .map(([key, value]) => ([key.trim(), value.trim()]));

    // merge into build args
    this.buildArgs = merge({}, this.buildArgs, Object.fromEntries(args));
    this.debug('%o build-args are now %o', this.id, this.buildArgs);
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
    this.#data.sources.push(({source: data.context, target: '.'}));
  }

  // just pushes the compose data directly into our thing
  addComposeData(data = {}) {
    // if we have a top level volume being added lets add that to #data so we can make use of it in
    // addServiceData's volume normalization
    if (data.volumes) this.#data.volumes = uniq([...this.#data.volumes, ...Object.keys(data.volumes)]);

    // @TODO: should we try to consolidate this?
    this.#app.add({
      id: `${this.id}-${nanoid()}`,
      info: this.info,
      data: [data],
    });

    // update app with new stuff
    this.#app.compose = require('../utils/dump-compose-data')(this.#app.composeData, this.#app._dir);

    // update and log
    this.#app.v4.updateComposeCache();
  }

  // adds files/dirs to the build context
  addContext(context, group = 'context') {
    // if we have context info as a string then lets translate into an array
    if (context && typeof context === 'string') context = [context];
    // if we have context info as an object then lets translate into an array
    if (context && isObject(context)) context = [context];
    // if we have an array of context data then lets normalize it
    if (context && context.length > 0) {
      this.#data.sources.push(context.map(file => {
        // file is a string with src par
        if (typeof file === 'string' && toPosixPath(file).split(':').length === 1) file = {source: file, target: file};
        // file is a string with src and dest parts
        if (typeof file === 'string' && toPosixPath(file).split(':').length === 2) {
          const parts = file.split(':');
          const target = parts.pop();
          const source = parts.join(':');
          file = {source, target};
        }

        // normalize object
        if (isObject(file) && !file.source) {
          file.source = file.src;
          delete file.src;
        }
        if (isObject(file) && !file.target) {
          file.target = file.destination ?? file.dest;
          delete file.dest;
          delete file.destination;
        }

        // if source is actually a url then lets address that
        try {
          file.url = new URL(toPosixPath(file.source)).href;
          delete file.source;
        } catch {}

        // at this point we need to make sure a desintation is set
        if (!file.target && file.source) file.target = file.source;
        if (!file.target && file.url) file.target = new URL(file.url).pathname;
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
          if (file.permissions) file.instructions.push(`--chmod=${file.permissions}`);
          file.instructions.push(file.url ?? path.posix.resolve('/', file.target));
          file.instructions.push(path.posix.resolve('/', file.target));
          file.instructions = file.instructions.join(' ');
        }

        // ensure instructions are an array
        if (typeof file.instructions === 'string') file.instructions = [`${file.instructions}`];

        // remove other extraneous keys
        if (isObject(file) && file.group) delete file.group;
        if (isObject(file) && file.perms) delete file.perms;
        if (isObject(file) && file.user) delete file.user;

        // should be ready for all the things eg pushing as a build step
        if (group) this.addSteps({group, instructions: file.instructions.join('\n'), contexted: true});

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

        this.debug('%o added build group %o', this.id, group);
      });
    }
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
      this.#data.sources.push(({source: this.#data.imageFileContext, target: '.'}));
    }

    // if we have context data then lets pass that in as well
    if (data.args) this.addBuildArgs(data.args);
    // if we have context data then lets pass that in as well
    if (data.context) this.addContext(data.context);
    // if we have groups data then
    if (data.groups) this.addGroups(data.groups);
    // if we have activated ssh then figure all of that out
    if (data.ssh) this.addSSH(data.ssh);
    // handle steps data
    if (data.steps) this.addSteps(data.steps);
    // if we have a custom tag then set that
    if (data.tag) this.tag = data.tag;

    // finally make sure we honor buildkit disabling
    if (require('../utils/is-disabled')((data.buildkit || data.buildx) ?? this.buildkit)) this.buildkit = false;
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
    // @NOTE: this normalization ONLY applies here, not in the generic addComposeData
    if (compose.volumes) compose.volumes = this.normalizeVolumes(compose.volumes);

    // add the data
    this.addComposeData({services: {[this.id]: compose}});
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
        // push
        this.#data.steps.push(step);
      });
    }
  }

  // add agent info
  // @TODO: should we throw an error if the socket does not exist or should we just rely on downstream errors?
  addSSHAgent(agent = process.env.SSH_AUTH_SOCK) {
    // if agent is true then reset it to $SSH_AUTH_SOCK
    if (agent === true) agent = '$SSH_AUTH_SOCK';

    // if ssh agent is a non false stringy value that does not exist on the fs then get the path from envvar
    if (agent !== false && typeof agent === 'string' && !fs.existsSync(agent)) {
      agent = agent.startsWith('$') ? agent = process.env[agent.slice(1)] : process.env[agent];
    }

    // @TODO: make this better?
    this.sshSocket = agent;
  }

  addSSHKeys(keys = []) {
    // if keys are explicitly set to false then reset keys to be empty
    if (keys === false) {
      this.sshKeys = [];
      return;
    }

    // if ssh keys is true then set it to our default dirs'
    if (keys === true) {
      keys = [
        path.join(os.homedir(), '.ssh'),
        path.resolve(this.#lando.config.userConfRoot, 'keys'),
      ];
    }

    // if keys are a string then arrayify
    if (typeof keys === 'string') keys = [keys];

    // if keys are not an array at this point then do nothing
    if (!Array.isArray(keys)) return;

    // reset keys
    this.sshKeys = [...new Set(this.sshKeys.concat(keys))];
  }

  // add/merge in ssh stuff for buildkit
  addSSH(ssh) {
    // if ssh is explicitly true then that implies agent true and keys true
    if (ssh === true) ssh = {agent: true, keys: true};

    // if ssh is not an object at this point then we need to return false
    if (!isObject(ssh)) {
      this.debug('%o could not interpret ssh %o, must be boolean or object, setting to false', this.id, ssh);
      return false;
    }

    // agent
    this.addSSHAgent(ssh.agent);
    // keys
    this.addSSHKeys(ssh.keys);
  }

  // build the image
  async buildImage() {
    // get build func
    const bengine = L337ServiceV4.getBengine(L337ServiceV4.bengineConfig, {
      builder: L337ServiceV4.builder,
      debug: this.debug,
      orchestrator: L337ServiceV4.orchestrator,
    });
    // separate out imagefile and context
    const {imagefile, ...context} = this.generateBuildContext();

    try {
      const success = {imagefile, ...context};

      // only build if image is not already built
      if (this?.info?.state?.IMAGE !== 'BUILT') {
        // set state
        this.info = {state: {IMAGE: 'BUILDING'}};
        // run with the appropriate builder
        const result = this.buildkit
          ? await bengine.buildx(imagefile, context) : await bengine.build(imagefile, context);
        // augment the success info
        Object.assign(success, result);
      }

      // get the inspect data so we can do other things
      success.info = await bengine.getImage(context.tag).inspect();

      // add the final compose data with the updated image tag on success
      // @NOTE: ideally its sufficient for this to happen ONLY here but in v3 its not
      this.addComposeData({services: {[context.id]: {image: context.tag}}});
      // set the image stuff into the info
      this.info = {image: imagefile, state: {IMAGE: 'BUILT'}, tag: context.tag};
      this.debug('image %o built successfully from %o', context.id, imagefile);
      return success;

    // failure
    } catch (error) {
      // augment error
      error.context = {imagefile, ...context};
      error.logfile = path.join(context.context ?? os.tmpdir(), `error-${nanoid()}.log`);
      this.debug('image %o build failed with code %o error %o', context.id, error.code ?? 1, error.message);
      this.debug('%o', error?.stack ?? error);

      // inject helpful failing stuff to compose
      this.addComposeData({services: {[context.id]: {
        command: require('../utils/get-v4-image-build-error-command')(error),
        image: 'busybox',
        user: 'root',
        volumes: [`${error.logfile}:/tmp/error.log`],
      }}});

      // set the image stuff into the info
      this.info = {error: error.short, image: undefined, state: {IMAGE: 'BUILD FAILURE'}, tag: undefined};
      this.tag = undefined;

      // then throw
      throw error;
    }
  }

  async destroy() {
    // remove build contexts and tmp
    remove(this.context);
    remove(this.tmpdir);
    this.debug('removed build-context %o', this.context);
    this.debug('removed tmpdir %o', this.tmpdir);
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

      // if we have any rogue uncontexted COPY/ADD instructions then we need to add appropriate sources to make sure
      // it all works seemlessly
      if (steps[group]
        .map((step, index) => ({index, step, contexted: data[index].contexted === true}))
        .filter(step => hasInstructions(step.step, ['COPY', 'ADD']))
        .map(step => step.contexted)
        .reduce((contexted, step) => contexted || !step, false)) {
        this.#data.sources.push(({source: this.#data.imageFileContext || this.appRoot, target: '.'}));
      }

      // attempt to normalize newling usage mostly for aesthetic considerations
      steps[group] = steps[group]
        .map(instructions => instructions.split('\n')
        .filter(instruction => instruction && instruction !== ''))
        .flat(Number.POSITIVE_INFINITY);

      // prefix user and comment data and some helpful envvars
      steps[group].unshift(`USER ${user}`);
      steps[group].unshift(`ENV LANDO_IMAGE_GROUP=${group}`);
      steps[group].unshift(`ENV LANDO_IMAGE_USER=${user}`);
      steps[group].unshift(`# group: ${group}`);
      // and add a newline for readability
      steps[group].push('');
      // and then finally put it all together
      steps[group] = steps[group].map(line => line.trimStart()).join('\n');
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
    write(this.imagefile, content);

    // return the build context
    return {
      id: this.id,
      buildArgs: this.buildArgs,
      context: this.context,
      imagefile: this.imagefile,
      sources: this.#data.sources.flat(Number.POSITIVE_INFINITY).filter(Boolean).filter(source => !source.url),
      sshSocket: this.sshSocket,
      sshKeys: require('../utils/get-passphraseless-keys')(this.sshKeys),
      tag: this.tag,
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

  normalizeFileInput(data, {dest = undefined} = {}) {
    // if data is not a stringy then do something else?
    if (!isStringy(data)) {
      this.debug('%o does not seem to be valid file input data', data);
      return data;
    }

    // if data is a single line string then just return it
    if (data.split('\n').length === 1) return path.resolve(this.appRoot, data);

    // if dest is undefined and we have ImportString then lets use that filename
    if (dest === undefined && data?.constructor?.name === 'ImportString') {
      const {file} = data.getMetadata();
      if (file) dest = path.basename(file);
    }

    // if we are here it is multiline and lets dump to a tmp file and return that
    const file = path.join(this.tmpdir, dest ?? nanoid());
    write(file, data, {forcePosixLineEndings: true});

    return file;
  }

  normalizeVolumes(volumes = []) {
    if (!Array.isArray) return [];

    // normalize and return
    return volumes.map(volume => {
      // if volume is a one part string then just return so we dont have to handle it downstream
      if (typeof volume === 'string' && toPosixPath(volume).split(':').length === 1) return volume;

      // if volumes is a string with two colon-separated parts then do stuff
      if (typeof volume === 'string' && toPosixPath(volume).split(':').length === 2) {
        const parts = volume.split(':');
        const target = parts.pop();
        const source = parts.join(':');
        volume = {source, target};
      }

      // if volumes is a string with three colon-separated parts then do stuff
      if (typeof volume === 'string' && toPosixPath(volume).split(':').length === 3) {
        const parts = volume.split(':');
        const mode = parts.pop();
        const target = parts.pop();
        const source = parts.join(':');
        volume = {source, target, read_only: mode === 'ro'};
      }

      // at this point we should have an object and if it doesnt have a type we need to try to figure it out
      // which should be PRETTY straightforward as long as named volumes have been added first
      if (!volume.type) volume.type = this._data.volumes.includes(volume.source) ? 'volume' : 'bind';

      // normalize relative bind mount paths to the appRoot
      if (volume.type === 'bind' && !path.isAbsolute(volume.source)) {
        volume.source = path.join(this.appRoot, volume.source);
      }

      // if the bind mount source does not exist then attempt to create it?
      // we make an "exception" for any /run/host-services things that are in the docker vm
      // @NOTE: is this actually a good idea?
      if (volume.type === 'bind'
        && !fs.existsSync(volume.source)
        && !volume.source.startsWith('/run/host-services')) {
        fs.mkdirSync(volume.source, {recursive: true});
      }

      // return
      return volume;
    });
  }

  // sets the base image for the service
  setBaseImage(image, buildArgs = {}) {
    // if the data is raw imagefile instructions then dump it to a file and set to that file
    if (image.split('\n').length > 1) {
      const content = image;
      image = path.join(this.tmpdir, 'Imagefile');
      fs.mkdirSync(path.dirname(image), {recursive: true});
      write(image, content);
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
      ? read(image) : generateDockerFileFromArray([{from: {baseImage: image}}]);
    this.info.image = image;

    // finally lets reset the relevant build key if applicable
    if (fs.existsSync(image)) {
      this.addComposeData({services: {[this.id]: {
        build: merge({}, buildArgs, {dockerfile: path.basename(image), context: path.dirname(image)}),
      }}});

    // or the image one if its that one
    } else {
      this.addComposeData({services: {[this.id]: {image}}});
    }

    // log
    this.debug('set base image to %o with instructions %o', this.#data.image, this.#data.imageInstructions);
  }
}

module.exports = L337ServiceV4;
