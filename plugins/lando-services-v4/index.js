'use strict';

module.exports = lando => {
  lando.events.on('post-bootstrap-app', () => {
    // add core v4 classes to factory
    // @NOTE: we do this here so the builder is available to non-app things like the initialization container
    lando.factory.registry.unshift({api: 4, name: 'l337', builder: require('./lib/l337-v4')});
  });
};
