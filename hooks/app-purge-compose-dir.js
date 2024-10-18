'use strict';

const remove = require('../utils/remove');

module.exports = async (app, lando) => {
  // remove app compose directory and other things
  try {
    remove(app._dir, {recursive: true, force: true});
  } catch {}
};
