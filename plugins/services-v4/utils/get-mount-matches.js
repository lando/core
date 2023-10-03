'use strict';

const fs = require('fs');
const path = require('path');

// checks to see if dir is being mounted
module.exports = (dir, volumes = []) => volumes
  // filter out non string bind mounts
  .filter(volume => volume.split(':').length === 2 || volume.split(':').length === 3)
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
