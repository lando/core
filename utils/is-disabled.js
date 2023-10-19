'use strict';

module.exports = data => {
  // return true if boolean false
  if (data === false || data === 0) return true;
  // return true if nully
  else if (data === undefined || data === null) return true;
  // return true if stringy false
  else if (typeof data === 'string') {
    return data.toUpperCase() === '0'
      || data.toUpperCase() === 'FALSE'
      || data.toUpperCase() === 'OFF'
      || data.toUpperCase() === 'DISABLE'
      || data.toUpperCase() === 'DISABLED';
  }

  // otherwise its not disabled;
  return false;
};
