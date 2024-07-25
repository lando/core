'use strict';

const {color} = require('listr2');

const {bold} = color;

// checks to see if a setting is disabled
module.exports = error => ({
  title: `Could not build app in "${error.id}!"`,
  type: 'warn',
  detail: [
    `App build steps failed in ${bold([error.command, error.args].flat().join(' '))}`,
    `Rerun with ${bold('lando rebuild --debug')} to see the entire build log and look for errors.`,
    `When you've resolved the build issues you can then:`,
  ],
  command: 'lando rebuild --debug',
});
