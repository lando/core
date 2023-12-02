'use strict';

module.exports = async (app, lando) => {
  if (lando.config.channel !== 'none' && lando.cache.get('updates-2')) {
    const {updates} = lando.cache.get('updates-2');
    app.addMessage({
      title: 'Updates available!',
      type: 'tip',
      detail: [
        `Lando has detected ${updates} packages that can be updated.`,
        'Updating fixes bugs, security issues and bring new features.',
        'We recommend you run:',
      ],
      command: 'lando update',
    });
  }
};
