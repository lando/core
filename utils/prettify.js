'use strict';

const os = require('os');

/*
 * prettify object data for better tabular output
 * @TODO: is it ok to assume that all data in an array will be the same type?
 */
module.exports = (data, {arraySeparator = ', '} = {}) => {
  // if undefined then just return an empty string
  if (data === undefined) return '';

  // handle arrays differently
  if (Array.isArray(data)) {
    // join lists of strings together
    if (typeof data[0] === 'string') {
      return data.join(arraySeparator);
    }

    // print arrays of objects nicely
    if (data[0] && typeof data[0] === 'object' && Object.keys(data[0]).length > 0) {
      return data.map(item => {
        // if it doesnt have keys just return
        if (typeof item !== 'object') return item;
        // otherwise
        return Object.keys(item).map(key => `${key}: ${item[key]}`).join(', ');
      }).join(os.EOL);
    }
  }

  return data;
};

