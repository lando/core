'use strict';

const path = require('path');

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
      const shellExport = `export PATH="${shellPaths.join(path.delimiter)}\${PATH+${path.delimiter}$PATH}";`;

      // if add is passed in but is empty then attempt to discover
      if (options.add !== undefined && options.add === '') {
        options.add = require('../utils/get-shell-profile')();
        options.a = options.add;
      }

      // if we are adding
      if (options.add) {
        await require('../utils/prepend-2-file')(options.add, shellExport);
        console.log(`Prepended ${shellExport} to ${options.add}`);
        console.log(`Open a new shell or run "source ${options.add}" to load the changes`);

      // if we are checking
      } else if (options.check) {
        const {entrypoint} = lando?.config?.cli ?? {};
        if (require('../utils/is-in-path')(entrypoint)) {
          console.log(`${entrypoint} is in PATH`);
        // throw if not
        } else throw new Error(`${entrypoint} does not appear to be in PATH!`);


      // finally just print the thing
      } else {
        console.log(shellExport);
        // console.log(options)
      };
    },
  };
};
