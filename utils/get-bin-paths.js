'use strict';

const fs = require('fs');
const path = require('path');

module.exports = ({entrypoint, file, installPath}) => {
  return [installPath, entrypoint, file]
    .filter(p => typeof p === 'string' && p !== '' && fs.existsSync(p))
    .map(p => !fs.lstatSync(p).isDirectory() ? path.dirname(p) : p)
    .filter(p => !process.env.PATH.split(path.delimiter).includes(p) || p === installPath)
    .filter((v, i, self) => i === self.indexOf(v));
};
