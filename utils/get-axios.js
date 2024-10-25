'use strict';

const {create} = require('axios');
const {HttpAgent, HttpsAgent} = require('@npmcli/agent');

module.exports = (opts = {}, httpOpts = {}, httpsOpts = {}) => create({
  httpAgent: new HttpAgent({family: 4, ...httpOpts}),
  httpsAgent: new HttpsAgent({family: 4, ...httpsOpts}),
  ...opts,
});
