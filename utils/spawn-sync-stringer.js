'use strict';

const {spawnSync} = require('child_process');

module.exports = (...args) => {
  const result = spawnSync(...args);

  // stringify and trim
  result.stdout = result.stdout.toString().trim();
  result.stderr = result.stderr.toString().trim();
  return result;
};
