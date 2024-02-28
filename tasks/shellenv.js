'use strict';

const os = require('os');
const {color} = require('listr2');

module.exports = lando => {
  return {
    command: 'shellenv',
    level: 'tasks',
    options: {
      add: {
        describe: 'Add to shell profile if blank lando will attempt discovery',
        alias: ['a'],
        string: true,
      },
      check: {
        describe: 'Check to see if lando is in PATH',
        alias: ['c'],
        boolean: true,
      },
    },

    run: async options => {
      // does nothing on windows
      if (process.platform === 'win32') throw new Error('shellenv is not available on Windows!');

      // get shell paths from cli
      // @NOTE: in lando 3 it _should_be impossible for this to be undefined but should be throw an error?
      const shellPaths = require('../utils/get-shellenv-paths')(lando?.config?.cli);
      const shellEnv = require('../utils/get-shellenv')(shellPaths);

      // if add is passed in but is empty then attempt to discover
      if (options.add !== undefined && options.add === '') {
        options.add = require('../utils/get-shell-profile')();
        options.a = options.add;
      }

      // if we are adding
      if (options.add) {
        if (shellEnv.length > 0) {
          require('../utils/update-shell-profile')(options.add, shellEnv);
          console.log(`Updated ${color.green(options.add)} to include:`);
          console.log();
          console.log(color.bold(shellEnv.map(line => line[0]).join(os.EOL)));
          console.log();
          console.log(`Open a new shell or run ${color.bold(`source ${options.add}`)} to load the changes`);
        } else {
          console.log(`Looks like ${color.green(options.add)} is already ready to go!`);
        }

      // if we are checking
      } else if (options.check) {
        const {entrypoint} = lando?.config?.cli ?? {};
        if (require('../utils/is-in-path')(entrypoint)) {
          console.log(`${color.green(entrypoint)} is in ${color.bold('PATH')}`);
        // throw if not
        } else throw new Error(`${color.red(entrypoint)} does not appear to be in ${color.bold('PATH')}!`);

      // shell env is already set up
      } else if (shellEnv.length === 0) {
        console.log(`Looks like your shell is already ready to go!`);

      // finally just print the thing
      } else {
        console.log(shellEnv.map(line => line[0]).join(os.EOL));
      };
    },
  };
};
