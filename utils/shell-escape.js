'use strict';

const _ = require('lodash');
const parse = require('string-argv');

module.exports = (command, wrap = false, args = process.argv.slice(3)) => {
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
