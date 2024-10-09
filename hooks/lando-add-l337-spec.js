'use strict';

module.exports = async lando => {
  lando.factory.registry.unshift({api: 4, name: 'l337', builder: require('../components/l337-v4')});
};
