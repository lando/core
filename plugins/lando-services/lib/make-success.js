'use strict';

/*
 * Attempts to produce a standardized error object
 */
module.exports = ({
  all,
  args,
  command,
  stdout,
  stderr,
}) => ({
  command,
  args,
  exitCode: 0,
  stdout,
  stderr,
  all,
});
