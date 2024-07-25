'use strict';

const _ = require('lodash');

module.exports = (command, wrap = false, args = process.argv.slice(3), v4Exec = false) => {
  // if api 4 then just prepend and we will handle it downstream
  if (v4Exec) {
    if (_.isString(command)) command = require('string-argv')(command);
    return ['/etc/lando/exec.sh', ...command];
  }

  // If no args and is string then just wrap and return
  if (_.isString(command) && _.isEmpty(args)) {
    return ['/bin/sh', '-c', command];
  }

  // Parse the command if its a string
  if (_.isString(command)) command = require('string-argv')(command);

  // Wrap in shell if specified
  if (wrap && !_.isEmpty(_.intersection(command, ['&', '&&', '|', '||', '<<', '<', '>', '>>', '$']))) {
    command = ['/bin/sh', '-c', command.join(' ')];
  }

  // Return
  return command;
};
