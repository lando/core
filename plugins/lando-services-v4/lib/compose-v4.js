'use strict';

const _ = require('lodash');

class ComposeServiceV4 {
  constructor(id, config = {}, ctx = {}) {
    this.id = id;
    this.config = config;

    this.buildContext = {};
    this.data = {};
    this.composeData = [];
    this.info = {};
  };

  dump() {
    return {
      buildContext: this.buildContext,
      compose: {
        id: this.id,
        info: this.info,
        data: _(this.composeData).map(element => _.merge({}, element, {version: '3.6'})).value(),
      },
      info: this.info,
    };
  }
};

module.exports = ComposeServiceV4;
