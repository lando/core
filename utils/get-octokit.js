'use strict';

const {Octokit} = require('@octokit/rest');

const {HttpsAgent} = require('@npmcli/agent');

const defaults = {
  userAgent: 'Lando/unknown',
  request: {
    agent: new HttpsAgent({family: 4}),
  },
};

module.exports = (options = {}) => new Octokit({...defaults, ...options});
