'use strict';

/* eslint-disable complexity */
/*
 * Attempts to produce a standardized error object
 */
module.exports = ({
  all,
  args,
  code,
  command,
  context,
  error,
  errorCode,
  short,
  statusCode,
  stdout,
  stderr,
  exitCode = 1,
}) => {
  // attempt to discover various codes
  code = (error && error.code) || code || undefined;
  errorCode = (error && error.code) || errorCode || undefined;
  statusCode = (error && error.statusCode) || statusCode || undefined;

  // construct a better message
  // @TODO: does this make sense?
  short = short ||
    (error && error?.json?.message) ||
    (error && error.reason) ||
    (error && error.body && error.body.error);
  const message = [stdout, stderr].filter(Boolean).join('\n') || all || error.message;

  // repurpose original error if we have one
  if (Object.prototype.toString.call(error) === '[object Error]') {
    error.originalMessage = error.message;
    error.message = message || error.originalMessage || short || stdout || stderr || all;

  // otherwise begin anew
  } else {
    error = new Error(message);
  }

  // Try to standardize things
  error.all = all;
  error.code = code;
  error.command = command;
  error.context = context;
  error.args = args;
  error.errorCode = errorCode ?? code;
  error.exitCode = exitCode ?? code;
  error.short = short || message || stdout || stderr || all;
  error.statusCode = statusCode;
  error.stdout = stdout;
  error.stderr = stderr;

  // @TODO: filter out unset properties?
  // send it back
  return error;
};
