'use strict';

const _ = require('lodash');

// Helper to bind exposed ports to the correct address
const normalizeBind = (bind, address = '127.0.0.1') => {
  // If bind is not a string, return right away
  if (!_.isString(bind)) return bind;

  // Otherwise attempt to do stuff
  const pieces = _.toString(bind).split(':');
  // If we have three pieces then honor the users choice
  if (_.size(pieces) === 3) return bind;
  // Unshift the address to the front and return
  else if (_.size(pieces) === 2) {
    pieces.unshift(address);
    return pieces.join(':');
  }
  // Otherwise we can just return the address prefixed to the bind
  return `${address}::${bind}`;
};

module.exports = async (app, lando) => {
  _.forEach(app.composeData, service => {
    _.forEach(service.data, datum => {
      _.forEach(datum.services, props => {
        if (!_.isEmpty(props.ports)) {
          app.log.debug('ensuring exposed ports on %s are bound to %s', service.id, lando.config.bindAddress);
          props.ports = _(props.ports).map(port => normalizeBind(port, lando.config.bindAddress)).value();
        }
      });
    });
  });
};
