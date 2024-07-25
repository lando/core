'use strict';

module.exports = lando => ({
  command: 'stuff2',
  level: 'tasks',
  describe: 'Tests another app loaded plugin',
  run: () => {
    console.log('I WORKED!');
  },
});
