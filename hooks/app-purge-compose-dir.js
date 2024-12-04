'use strict';

const remove = require('../utils/remove');

module.exports = async app => {
  // remove app compose directory and other things
  try {
    remove(app._dir);
  } catch {}
};
