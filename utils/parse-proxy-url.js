
'use strict';

const _ = require('lodash');
const url = require('url');

module.exports = data => {
  // We add the protocol ourselves, so it can be parsed. We also change all *
  // occurrences for our magic word __wildcard__, because otherwise the url parser
  // won't parse wildcards in the hostname correctly.
  const parsedUrl = _.isString(data) ? url.parse(`http://${data}`.replace(/\*/g, '__wildcard__')) : _.merge({}, data, {
    hostname: data.hostname.replace(/\*/g, '__wildcard__'),
  });

  // If the port is null then set it to 80
  if (_.isNil(parsedUrl.port)) parsedUrl.port = '80';

  // Retranslate and send
  const defaults = {port: '80', pathname: '/', middlewares: []};
  return _.merge(defaults, parsedUrl, {host: parsedUrl.hostname.replace(/__wildcard__/g, '*')});
};
