'use strict';

const _ = require('lodash');
const isStringy = require('./is-stringy');
const {nanoid} = require('nanoid');

module.exports = (command, wrap = false, args = process.argv.slice(3), sapi = 3) => {
  // if stringy and multiline and
  if (isStringy(command) && command.split('\n').length > 1) {
    // prep for multipass
    const script = Buffer.from(command, 'utf8').toString('base64');
    // different strokes
    if (sapi === 4) return ['/etc/lando/exec-multiliner.sh', script, ...args];
    else if (sapi === 3) return ['/helpers/exec-multiliner.sh', script, ...args];
    else {
      const file = `/tmp/${nanoid()}.sh`;
      return [
        '/bin/sh',
        '-c',
        `echo ${script} | base64 -d > ${file} && chmod +x ${file} && ${file} ${args.join(' ')}`,
      ];
    }
  }

  // if api 4 then just prepend and we will handle it downstream
  if (sapi === 4) {
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
