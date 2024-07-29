'use strict';

const fs = require('fs');

module.exports = async (app, lando) => {
  // remove app compose directory and other things
  try {
    fs.rmSync(app._dir, {recursive: true, force: true});
  } catch {}
};
