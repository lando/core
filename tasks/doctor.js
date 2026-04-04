'use strict';

const {color, figures} = require('listr2');

module.exports = lando => ({
  command: 'doctor',
  describe: 'Runs environment health checks',
  usage: '$0 doctor',
  examples: [
    '$0 doctor',
  ],
  level: 'tasks',
  run: async () => {
    const ux = lando.cli.getUX();
    const checks = [];

    if (lando.config.engine === 'containerd') {
      checks.push(...await require('../hooks/lando-doctor-containerd')(lando));
    }

    if (checks.length === 0) {
      console.log('No doctor checks available for the current engine.');
      return;
    }

    const rows = checks.map(check => {
      let status;
      switch (check.status) {
        case 'ok':
          status = color.green(figures.tick);
          break;
        case 'warning':
          status = color.yellow(figures.warning);
          break;
        default:
          status = color.red(figures.cross);
          break;
      }

      return {
        check: check.title,
        status,
        message: check.message,
      };
    });

    console.log('');
    ux.table(rows, {
      check: {header: 'CHECK'},
      status: {header: 'STATUS'},
      message: {header: 'MESSAGE'},
    });
    console.log('');

    if (checks.some(check => check.status === 'error')) {
      throw new Error('Doctor found one or more errors.');
    }
  },
});
