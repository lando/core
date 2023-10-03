'use strict';

// Modules
const _ = require('lodash');
const chalk = require('chalk');
const copydir = require('copy-dir');
const fs = require('fs');
const mkdirp = require('mkdirp');
const parse = require('string-argv');
const os = require('os');
const path = require('path');
const Yaml = require('./yaml');
const yaml = new Yaml();
const url = require('url');

/*
 * Helper method to get the host part of a volume
 */
exports.getHostPath = mount => _.dropRight(mount.split(':')).join(':');

/*
 * Takes inspect data and extracts all the exposed ports
 */
exports.getUrls = (data, scan = ['80, 443'], secured = ['443'], bindAddress = '127.0.0.1') => {
  return _(_.merge(_.get(data, 'Config.ExposedPorts', []), {'443/tcp': {}}))
  .map((value, port) => ({
    port: _.head(port.split('/')),
    protocol: (_.includes(secured, port.split('/')[0])) ? 'https' : 'http'}
  ))
  .filter(exposed => _.includes(scan, exposed.port))
  .flatMap(ports => _.map(_.get(data, `NetworkSettings.Ports.${ports.port}/tcp`, []), i => _.merge({}, ports, i)))
  .filter(ports => _.includes([bindAddress, '0.0.0.0'], ports.HostIp))
  .map(ports => url.format({
    protocol: ports.protocol,
    hostname: 'localhost',
    port: _.includes(scan, ports.port) ? ports.HostPort : '',
  }))
  .thru(urls => ({service: data.Config.Labels['com.docker.compose.service'], urls}))
  .value();
};

/*
 * Helper method to normalize a path so that Lando overrides can be used as though
 * the docker-compose files were in the app root.
 */
exports.normalizePath = (local, base = '.', excludes = []) => {
  // Return local if it starts with $ or ~
  if (_.startsWith(local, '$') || _.startsWith(local, '~')) return local;
  // Return local if it is one of the excludes
  if (_.includes(excludes, local)) return local;
  // Return local if local is an absolute path
  if (path.isAbsolute(local)) return local;
  // Otherwise this is a relaive path so return local resolved by base
  return path.resolve(path.join(base, local));
};

/*
 * Helper to normalize overrides
 */
exports.normalizeOverrides = (overrides, base = '.', volumes = {}) => {
  // Normalize any build paths
  if (_.has(overrides, 'build')) {
    if (_.isObject(overrides.build) && _.has(overrides, 'build.context')) {
      overrides.build.context = exports.normalizePath(overrides.build.context, base);
    } else {
      overrides.build = exports.normalizePath(overrides.build, base);
    }
  }
  // Normalize any volumes
  if (_.has(overrides, 'volumes')) {
    overrides.volumes = _.map(overrides.volumes, volume => {
      if (!_.includes(volume, ':')) {
        return volume;
      } else {
        const local = exports.getHostPath(volume);
        const remote = _.last(volume.split(':'));
        // @TODO: I don't think below does anything?
        const excludes = _.keys(volumes).concat(_.keys(volumes));
        const host = exports.normalizePath(local, base, excludes);
        return [host, remote].join(':');
      }
    });
  }
  return overrides;
};

/*
 * Returns a CLI table with app start metadata info
 */
exports.startTable = (app, {legacyScanner = false} = {}) => {
  const data = {
    name: app.name,
    location: app.root,
    services: _(app.info)
      .map(info => (info.healthy) ? chalk.green(info.service) : chalk.yellow(info.service))
      .values()
      .join(', '),
  };
  const urls = {};

  // Categorize and colorize URLS if and as appropriate
  // add legacy scanner info if appropriate
  if (legacyScanner) {
    _.forEach(app.info, info => {
      if (_.has(info, 'urls') && !_.isEmpty(info.urls)) {
        urls[info.service] = _.filter(app.urls, item => {
          item.theme = chalk[item.color](item.url);
          return _.includes(info.urls, item.url);
        });
      }
    });

    // Add service URLS
    _.forEach(urls, (items, service) => {
      data[service + ' urls'] = _.map(items, 'theme');
    });

  // add placeholder URLS for non le
  } else {
    data.urls = '';
  }

  // Return data
  return data;
};

/*
 * Helper to strip the patch version
 */
exports.stripPatch = version => _.slice(version.split('.'), 0, 2).join('.');

/*
 * Helper to help us allow wildcard patch versions eg when there is no minor version tag available
 */
exports.stripWild = versions => _(versions)
  .map(version => (version.split('.')[2] === 'x') ? _.slice(version.split('.'), 0, 2).join('.') : version)
  .value();


/*
 * Helper to get app mounts
 */
exports.getAppMounts = app => _(app.services)
  // Objectify
  .map(service => _.merge({name: service}, _.get(app, `config.services.${service}`, {})))
  // Set the default
  .map(config => _.merge({}, config, {app_mount: _.get(config, 'app_mount', 'cached')}))
  // Filter out disabled mountes
  .filter(config => config.app_mount !== false && config.app_mount !== 'disabled')
  // Combine together
  .map(config => ([config.name, {volumes: [`${app.root}:/app:${config.app_mount}`]}]))
  .fromPairs()
  .value();

/*
 * Translate a name for use by docker-compose eg strip `-` and `.` and
 * @TODO: Eventually we want to get rid of this since it should only happen once
 * on the appName itself
 */
exports.dockerComposify = data => _.toLower(data).replace(/_|-|\.+/g, '');

/*
 * Translate a name for use by docker-compose eg strip `-` and `.` and
 * @TODO: Eventually we want to get rid of this since it should only happen once
 * on the appName itself
 * @TODO: We should probably also have a hashed id that we can use for other things
 * eg the cache
 */
exports.appMachineName = data => require('transliteration').slugify(data);

/*
 * Helper to dump all our compose data to files
 */
exports.dumpComposeData = (data, dir) => _(_.flatten([data]))
  .flatMap(group => _.map(group.data, (compose, index) => ({data: compose, file: `${group.id}-${index}.yml`})))
  .map(compose => yaml.dump(path.join(dir, compose.file), compose.data))
  .value();

/*
 * Helper to download a file to a path
 */
exports.dumpComposeData = (data, dir) => _(_.flatten([data]))
  .flatMap(group => _.map(group.data, (compose, index) => ({data: compose, file: `${group.id}-${index}.yml`})))
  .map(compose => yaml.dump(path.join(dir, compose.file), compose.data))
  .value();


/*
 * Helper to load raw docker compose files
 */
exports.loadComposeFiles = (files, dir) => _(exports.validateFiles(files, dir))
  .map(file => yaml.load(file))
  .value();

/*
 * Helper to get default cli envvars
 */
exports.getCliEnvironment = (more = {}) => _.merge({}, {
  PHP_MEMORY_LIMIT: '-1',
}, more);

/*
 * Helper to return a valid id from app data
 */
exports.getId = c => c.cid || c.id || c.containerName || c.containerID || c.name;

/*
 * Returns a default info object
 */
exports.getInfoDefaults = app => _(app.services)
  .map(service => ({service, urls: [], type: 'docker-compose', healthy: true}))
  .map(service => _.merge({}, service, _.find(app.info, {service: service.service})))
  .value();

/*
 * Helper to get globals
 */
exports.getGlobals = app => exports.toObject(app.services, {
  networks: {default: {}},
  environment: app.env,
  env_file: app.envFiles,
  labels: app.labels,
  volumes: [`${app._config.userConfRoot}/scripts:/helpers`],
});

/*
 * Helper to find all our services
 */
exports.getServices = composeData => _(composeData)
  .flatMap(data => data.data)
  .flatMap(data => _.keys(data.services))
  .uniq()
  .value();

/*
 * Helper to get user
 */
exports.getUser = (name, info = []) => {
  // if no matching service return www-data
  if (!_.find(info, {service: name})) return 'www-data';
  // otherwise get the service
  const service = _.find(info, {service: name});
  // if this is a "no-api" service eg type "docker-compose" also return www-data
  if (!service.api && service.type === 'docker-compose') return 'www-data';
  // otherwise return different things based on the api
  return service.api === 4 ? service.user || 'www-data' : service.meUser || 'www-data';
};

/*
 * Helper to parse metrics data
 */
exports.metricsParse = app => {
  // Metadata to report.
  const data = {
    app: _.get(app, 'id', 'unknown'),
    type: _.get(app, 'config.recipe', 'none'),
  };

  // build an array of services to send as well if we can, prefer info since it has combined v3 and v4 stuff
  if (!_.isEmpty(app.info)) {
    data.services = _.map(_.get(app, 'info'), service => _.pick(service, ['api', 'type', 'version']));

  // otherwise lets use the older config.services
  } else if (_.has(app, 'config.services')) {
    data.services = _.map(_.get(app, 'config.services'), service => service.type);
  }

  // Return
  return data;
};

/*
 * We might have datum but we need to wrap in array so Promise.each knows
 * what to do
 */
exports.normalizer = data => (!_.isArray(data)) ? [data] : data;

/*
 * Helper to make a file executable
 */
exports.makeExecutable = (files, base = process.cwd()) => {
  _.forEach(files, file => {
    fs.chmodSync(path.join(base, file), '755');
  });
};

/*
 * Helper to move config from lando to a mountable directory
 */
exports.moveConfig = (src, dest = os.tmpdir()) => {
  // Copy opts and filter out all js files
  // We don't want to give the false impression that you can edit the JS
  const filter = (stat, filepath, filename) => (path.extname(filename) !== '.js');
  // Ensure to exists
  mkdirp.sync(dest);
  // Try to copy the assets over
  try {
    // @todo: why doesn't the below work for PLD?
    copydir.sync(src, dest, filter);
    exports.makeExecutable(_(fs.readdirSync(dest))
      .filter(file => path.extname(file) === '.sh')
      .value()
    , dest);
  } catch (error) {
    const code = _.get(error, 'code');
    const syscall = _.get(error, 'syscall');
    const f = _.get(error, 'path');

    // Catch this so we can try to repair
    if (code !== 'EISDIR' || syscall !== 'open' || !!mkdirp.sync(f)) {
      throw new Error(error);
    }

    // Try to take corrective action
    fs.unlinkSync(f);
    copydir.sync(src, dest, filter);
    exports.makeExecutable(_(fs.readdirSync(dest))
      .filter(file => path.extname(file) === '.sh')
      .value()
    , dest);
  };

  // Return the new scripts directory
  return dest;
};

/*
 * Helper to properly escape and potentially wrap a command for use with shell.sh
 */
exports.shellEscape = (command, wrap = false, args = process.argv.slice(3)) => {
  // If no args and is string then just wrap and return
  if (_.isString(command) && _.isEmpty(args)) {
    return ['/bin/sh', '-c', command];
  }

  // Parse the command if its a string
  if (_.isString(command)) command = parse(command);

  // Wrap in shell if specified
  if (wrap && !_.isEmpty(_.intersection(command, ['&', '&&', '|', '||', '<<', '<', '>', '>>', '$']))) {
    command = ['/bin/sh', '-c', command.join(' ')];
  }

  // Return
  return command;
};

/*
 * Extracts some docker inspect data and translates it into useful lando things
 */
exports.toLandoContainer = ({Labels, Id, Status}, separator = '_') => {
  // Get name of docker container.
  const app = Labels['com.docker.compose.project'];
  const service = Labels['com.docker.compose.service'];
  const num = Labels['com.docker.compose.container-number'];
  const lando = Labels['io.lando.container'];
  const special = Labels['io.lando.service-container'];
  // Build generic container.
  return {
    id: Id,
    service: service,
    name: [app, service, num].join(separator),
    app: (special !== 'TRUE') ? app : '_global_',
    src: (Labels['io.lando.src']) ? Labels['io.lando.src'].split(',') : 'unknown',
    kind: (special !== 'TRUE') ? 'app' : 'service',
    lando: (lando === 'TRUE') ? true : false,
    instance: Labels['io.lando.id'] || 'unknown',
    status: Status,
  };
};

/*
 * Helper to build an obkect from an array of keys and data
 */
exports.toObject = (keys, data = {}) => _(keys)
  .map(service => data)
  .map((service, index) => _.set({}, keys[index], service))
  .thru(services => _.reduce(services, (sum, service) => _.merge(sum, service), {}))
  .value();

/*
 * Validates compose files returns legit ones
 */
exports.validateFiles = (files = [], base = process.cwd()) => _(files)
  .map(file => (path.isAbsolute(file) ? file : path.join(base, file)))
  .filter(file => fs.existsSync(file))
  .value();
