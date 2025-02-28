'use strict';

const _ = require('lodash');

// Helpers to get scannable or not scannable services
const getScannable = app => _.filter(app.info, service => {
  const scanner = _.get(app, `config.services.${service.service}.scanner`, true);
  return scanner || _.isObject(scanner);
});
const getUnscannable = app => _.filter(app.info, service => {
  return _.get(app, `config.services.${service.service}.scanner`, true) === false;
});

module.exports = async app => {
  // Message to let the user know it could take a bit
  console.log('Scanning to determine which services are ready... Please stand by...');
  // Filter out any services where the scanner might be disabled
  return app.scanUrls(_.flatMap(getScannable(app), 'urls'), {max: 16}).then(urls => {
    // Get data about our scanned urls
    app.urls = urls;
    // Add in unscannable ones if we have them
    if (!_.isEmpty(getUnscannable(app))) {
      app.urls = app.urls.concat(_.map(_.flatMap(getUnscannable(app), 'urls'), url => ({
        url,
        status: true,
        color: 'yellow',
      })));
    }
  });
};
