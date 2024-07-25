'use strict';

module.exports = path => {
  return path.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, '/$1');
};
