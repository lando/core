'use strict';

module.exports = value => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};
