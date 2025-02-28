'use strict';

module.exports = () => ({
  command: 'stuff',
  level: 'tasks',
  describe: 'Tests an app loaded plugin',
  run: () => {
    console.log('I WORKED!');
  },
});
