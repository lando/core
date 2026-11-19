'use strict';

const {spawnSync} = require('child_process');

// @NOTE: valid-jsdoc does not understand TypeScript import types.
/* eslint-disable valid-jsdoc */
/**
 * Run a command synchronously and return trimmed output without masking spawn failures.
 * @param {Parameters<typeof spawnSync>} args arguments forwarded to spawnSync
 * @return {import('./spawn-sync-stringer.types').StringerResult} result with string output
 */
/* eslint-enable valid-jsdoc */
module.exports = (...args) => {
  const result = spawnSync(...args);

  // Preserve the original error, including its code, path and syscall.
  if (result.error) throw result.error;

  // stringify and trim
  return {
    ...result,
    stdout: (result.stdout ?? '').toString().trim(),
    stderr: (result.stderr ?? '').toString().trim(),
  };
};
