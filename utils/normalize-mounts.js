'use strict';

const fs = require('fs');
const isObject = require('lodash/isPlainObject');
const orderBy = require('lodash/orderBy');
const path = require('path');
const toPosixPath = require('./to-posix-path');
const remove = require('./remove');
const write = require('./write-file');
const uniq = require('lodash/uniq');

module.exports = (mounts, {_data, appRoot, normalizeVolumes, tmpdir, user}) => {
  return mounts.map(mount => {
    // if mount is a single string then assume its a bind mount and normalize
    if (typeof mount === 'string' && toPosixPath(mount).split(':').length > 1) {
      if (normalizeVolumes.bind({_data, appRoot})([mount]).length > 0) {
        mount = normalizeVolumes.bind({_data, appRoot})([mount])[0];
      }
    }

    // throw if not an object by now
    if (!isObject) {
      const error = new Error('Mount is not an object!');
      error.details = mount;
      throw error;
    }

    // allow a few other things like src to be used instead of source
    if (!mount.source) {
      mount.source = mount.src;
      delete mount.src;
    }

    // allow a few other things like dest|destination to be used instead of target
    if (!mount.target) {
      mount.target = mount.destination ?? mount.dest;
      delete mount.dest;
      delete mount.destination;
    }

    // if mount is an object with contents and no source then dump to file
    // note that this means source wins over content|contents if both are present
    if ((mount.contents || mount.content) && !mount.source) {
      // dump contents to file and set source to it
      mount.source = path.join(tmpdir, mount.target.split(path.sep).filter(part => part !== '').join('-'));
      fs.mkdirSync(path.dirname(mount.source), {force: true, maxRetries: 10, recursive: true});
      remove(mount.source);
      write(mount.source, mount.contents ?? mount.content);

      // clean up
      delete mount.contents;
      delete mount.content;
    }

    // if copy mount then merge in defaults and normalize
    // normalize copy mount stuff
    if (mount.type === 'copy') {
      // rebase on defaults
      mount = {group: 'user', user: user.name, ...mount};
      // normalize path if needed
      if (!path.isAbsolute(mount.source)) mount.source = path.join(appRoot, mount.source);

    // otherwise if its typeless or bind do the usual downstream normalization
    } else if (mount.type === 'bind' || !mount.type) {
      mount = normalizeVolumes.bind({_data, appRoot})([mount])[0] ?? {};
    }

    // @TODO: throw error if no target|source?

    // if bind and excludes then hold onto your butts
    if (mount.type === 'bind' && (mount.exclude || mount.excludes)) {
      // normalize and combine
      const data = uniq([mount.exclude, mount.excludes]
        .map(item => !Array.isArray(item) ? [item] : item)
        .flat(Number.POSITIVE_INFINITY))
        .filter(item => item)
        .map(item => toPosixPath(item));

      // seperate out includes and normalize path
      const includes = data.filter(exclude => exclude.startsWith('!'))
        .map(include => include.startsWith('!/') ? include.replace('!/', '!') : include)
        .map(include => include.startsWith('!') ? include.replace('!', '') : include);

      // ditto for excludes and then group by descending depth
      const excludes = orderBy(data.filter(exclude => !exclude.startsWith('!'))
        .map(exclude => exclude.startsWith('/') ? exclude.replace('/', '') : exclude)
        .map(exclude => ({
          path: exclude,
          depth: exclude.split('/').length,
        })), ['depth'], ['asc'])
        .map(exclude => exclude.path);

      // reset mount for inception
      delete mount.exclude;
      delete mount.excludes;
      mount = [mount];

      // if we actually have excludes then loop up through depth and add as storage
      if (excludes.length > 0) {
        for (const exclude of excludes) {
          mount.push({
            target: path.join(mount[0].target, exclude),
            scope: 'service',
            type: 'storage:volume',
          });
        }
      }

      // finally add in !
      if (includes.length > 0) {
        for (const include of includes) {
          mount.push({
            source: path.join(appRoot, include),
            target: path.join(mount[0].target, include),
            type: 'storage:bind',
          });
        }
      }

      return mount;
    }

    // if copy and includes then add additional mounts
    if (mount.type === 'copy' && (mount.include || mount.includes)) {
      // normalize and combine
      const includes = orderBy(uniq([mount.include, mount.includes]
        .map(include => !Array.isArray(include) ? [include] : include)
        .flat(Number.POSITIVE_INFINITY))
        .filter(include => include)
        .map(include => toPosixPath(include))
        .map(include => ({path: include, depth: include.split('/').length})), ['depth'], ['asc'])
        .map(include => include.path);

      // reset mount for inception
      delete mount.include;
      delete mount.includes;
      mount = [mount];

      // push on includes in the correct order
      if (includes.length > 0) {
        for (const include of includes) {
          mount.push({
            source: path.join(appRoot, include),
            target: path.join(mount[0].target, include),
            type: 'bind',
          });
        }
      }
    }

    return mount;
  }).flat(Number.POSITIVE_INFINITY);
};
