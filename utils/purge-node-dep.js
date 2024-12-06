'use strict';

const fs = require('fs');
const path = require('path');
const remove = require('./remove');

module.exports = (dir, dep) => {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fpath = path.join(dir, entry);
    const stats = fs.lstatSync(fpath);

    if (stats.isDirectory()) {
      if (entry === 'node_modules') {
        const ppath = path.join(fpath, dep);
        if (fs.existsSync(ppath)) {
          remove(ppath);
        }
      }
      if (!stats.isSymbolicLink()) {
        module.exports(fpath, dep);
      }
    }
  }
};
