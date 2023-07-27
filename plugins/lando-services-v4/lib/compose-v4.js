'use strict';

const _ = require('lodash');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
class ComposeServiceV4 {
  constructor(id, info = {}, buildContext = {}, ...compose) {
    this.id = id;
    this.buildContext = buildContext;
    this.compose = {id, info, data: _(compose).map(element => _.merge({}, element, {version: '3.6'})).value()};
    this.info = info;
  };
};

module.exports = ComposeServiceV4;
