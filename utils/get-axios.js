'use strict';

const axios = require('axios');

const {HttpAgent, HttpsAgent} = require('@npmcli/agent');

module.exports = (opts = {}, httpOpts = {}, httpsOpts = {}) => axios.create({
  httpAgent: new HttpAgent({family: 4, ...httpOpts}),
  httpsAgent: new HttpsAgent({family: 4, ...httpsOpts}),
  ...opts,
});
