'use strict';

const fs = require('fs');
const isObject = require('lodash/isPlainObject');
const path = require('path');
const toPosixPath = require('./to-posix-path');
const write = require('./write-file');

module.exports = (mounts, {appRoot, context, normalizeVolumes, _data}) => {
  return mounts.map(mount => {
    // if mount is a single string then assume its a bind mount and normalize
    if (typeof mount === 'string' && toPosixPath(mount).split(':').length > 1) {
      if (normalizeVolumes.bind({_data, appRoot})([mount]).length > 0) {
        mount = normalizeVolumes.bind({_data, appRoot})([mount])[0];
      }
    }

    // allow a few other things like dest|destination to be used instead of target
    if (isObject(mount) && !mount.target) {
      mount.target = mount.destination ?? mount.dest;
      delete mount.dest;
      delete mount.destination;
    }

    // if mount is an object with contents and no source then dump to file
    // note that this means source wins over content|contents if both are present
    if (isObject(mount) && (mount.contents || mount.content) && !mount.source) {
      // dump contents to file and set source to it
      mount.source = path.join(context, mount.target.split(path.sep).filter(part => part !== '').join('-'));
      fs.mkdirSync(path.dirname(mount.source), {force: true, maxRetries: 10, recursive: true});
      fs.rmSync(mount.source, {force: true, maxRetries: 10, recursive: true});
      write(mount.source, mount.contents ?? mount.content);

      // clean up
      delete mount.contents;
      delete mount.content;
    }

    // if mount is a typeless or mount object then also normalize
    if (isObject(mount) && !mount.type) {
      if (normalizeVolumes.bind({_data, appRoot})([mount]).length > 0) {
        mount = normalizeVolumes.bind({_data, appRoot})([mount])[0];
      }
    }

    // if this is a copy mount then make sure the group is set
    if (isObject(mount) && mount.type === 'copy' && !mount.group) mount.group = 'user';

    // @TODO: throw error if no target|source?
    // @TODO: handle includes/copy

    return mount;
  }).flat(Number.POSITIVE_INFINITY);
};
