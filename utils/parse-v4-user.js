
'use strict';

const isObject = require('lodash/isPlainObject');

module.exports = user => {
  // if user is nully then return empty object
  if (user === undefined || user === null || user === false) return {};

  // if user is a string then lets break it into parts and put it into an object
  if (typeof user === 'string') {
    const parts = user.split(':');
    user = {gid: parts[2], uid: parts[1], name: parts[0]};
  }

  // if user is an object
  if (isObject(user)) {
    // we want user.name to the canonical ones
    user.name = user.name ?? user.user ?? user.username;
    delete user.user;
    delete user.username;

    // remove undefined keys
    for (const key in user) {
      if (user[key] === undefined) delete user[key];
    }

    // return
    return user;
  }

  // if we get here i guess just return an empty object?
  // throw an error?
  return {};
};
