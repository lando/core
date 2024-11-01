'use strict';

module.exports = {
  name: '_lando-compose',
  parent: '_lando',
  builder: (parent, config) => class LandoComposeServiceV3 extends parent {
    constructor(id, options = {}) {
      super(id, options);
    };
  },
};
