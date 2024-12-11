'use strict';

const {nanoid} = require('nanoid');

/*
 * Init Lamp
 */
module.exports = {
  name: 'none',
  defaults: {
    something: 'happening-here',
  },
  overrides: {
    name: {
      when: answers => {
        answers.name = nanoid();
        return false;
      },
    },
    webroot: {when: () => false},
  },
};
