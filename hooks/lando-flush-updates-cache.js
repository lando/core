'use strict';

module.exports = async lando => {
  if (lando.config.channel !== 'none' && lando.cache.get('updates-2')) {
    const {expires} = lando.cache.get('updates-2');
    if (expires < Date.now()) lando.cache.remove('updates-2');
  }
};
