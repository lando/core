'use strict';

// checks to see if a setting is disabled
module.exports = plugins => {
  const toob = plugins.length > 1 ? 'are' : 'is a';
  const pp = plugins.length > 1 ? 'plugins' : 'plugin';
  return {
    title: 'You have legacy plugins!',
    type: 'tip',
    detail: [
      `${plugins.join(', ')} ${toob} legacy ${pp}.`,
      `This is ok and the ${pp} should still work correctly.`,
      'However, you might want to update to the new format:',
    ],
    url: 'https://docs.lando.dev/guides/updating-plugins-v4.html#lando-3-21-0',
  };
};
