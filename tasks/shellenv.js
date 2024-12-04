'use strict';

const os = require('os');
const {color} = require('listr2');

module.exports = lando => {
  return {
    command: 'shellenv',
    usage: '$0 shellenv [--check] [--shell <shell>]',
    examples: [
      '$0 shellenv --check',
      '$0 shellenv --shell bash',
    ],
    level: 'tasks',
    options: {
      add: {
        describe: 'Adds to shell profile if blank lando will attempt discovery',
        alias: ['a'],
        string: true,
      },
      check: {
        describe: 'Checks to see if lando is in PATH',
        alias: ['c'],
        boolean: true,
      },
    },

    run: async options => {
      const debug = require('../utils/debug-shim')(lando.log);

      // get shell paths from cli
      // @NOTE: in lando 3 it _should_be impossible for this to be undefined but should we throw an error?
      const binPaths = require('../utils/get-bin-paths')(lando?.config?.cli);
      const shellEnv = require('../utils/get-shellenv')(binPaths);

      // if add is passed in but is empty then attempt to discover
      if (options.add !== undefined && options.add === '') {
        options.add = require('../utils/get-shell-profile')();
        options.a = options.add;
        debug('attempting to use %o as the rcfile', options.add);
      }

      // if we are adding
      if (options.add) {
        // handle the special case of cmd.exe since it has no relavent shell profile
        if (shellEnv.length > 0 && require('../utils/get-user-shell')() === 'cmd.exe') {
          // build out args
          const args = require('string-argv')(shellEnv.map(line => line[0]).join(' && '));

          // @TODO: we really need to use is-elevated instead of is-root but we are ommiting for now since lando
          // really cant run elevated anyway and its a bunch of extra effort to make all of this aysnc
          // in Lando 4 this will need to be resolved though.
          const {stderr, code} = require('is-root')()
            ? await require('../utils/run-elevated')(args, {debug})
            : await require('../utils/run-command')(args[0], args.slice(1), {debug, ignoreReturnCode: true});

          // throw error
          if (code !== 0) throw new Error(`Could not add to PATH with error: ${stderr}`);

          // otherwise we are good
          console.log(`Updated ${color.green('PATH')} to include:`);
          console.log();
          console.log(color.bold(binPaths.join(os.EOL)));
          console.log();
          console.log(`Start a new terminal session to use ${color.bold(`lando`)}`);
          return;

        // otherwise update the shell profile
        } else if (shellEnv.length > 0) {
          require('../utils/update-shell-profile')(options.add, shellEnv);
          console.log(`Updated ${color.green(options.add)} to include:`);
          console.log();
          console.log(color.bold(shellEnv.map(line => line[0]).join(os.EOL)));
          console.log();
          console.log(`Start a new terminal session or run ${color.bold(`eval "$(lando shellenv)"`)} to use ${color.bold(`lando`)}`);
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
        console.error(`Looks like your shell is already ready to go!`);

      // finally just print the thing
      } else {
        console.log(shellEnv.map(line => line[0]).join(os.EOL));
      }
    },
  };
};
