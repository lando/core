'use strict';

// Modules
const _ = require('lodash');

/*
 * test recipe
 */
module.exports = {
  name: 'test',
  parent: '_recipe',
  config: {
    proxy: {},
    services: {},
    tooling: {
      'do-i-exist': {
        service: 'web',
        cmd: 'echo icachethereforeiam',
      },
      'env': {
        service: 'web',
      },
    },
  },
  builder: (parent, config) => class LandoDrupal7 extends parent {
    constructor(id, options = {}) {
      options.services = _.merge({}, options.services, {
        web: {
          api: 4,
          type: 'lando',
          image: 'nginxinc/nginx-unprivileged:1.26.1',
          ports: ['8080/http'],
        },
        web2: {
          api: 4,
          type: 'lando',
          image: 'nginxinc/nginx-unprivileged:1.26.1',
          ports: ['8080/http'],
        },
      });

      super(id, _.merge({}, config, options));
    }
  },
};
