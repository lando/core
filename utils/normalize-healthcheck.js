'use strict';

const defaults = {delay: 1000, retry: 25, user: 'root'};

module.exports = healthcheck => {
  // if healthcheck is a string then objectify
  if (typeof healthcheck === 'string') healthcheck = {command: healthcheck};
  // ditto if its an array
  else if (Array.isArray(healthcheck)) healthcheck = {command: healthcheck};
  // ditto if its an import string
  else if (healthcheck?.constructor?.name === 'ImportString') healthcheck = {command: healthcheck};
  // allow cmd shorthand
  if (!healthcheck.command && healthcheck.cmd) healthcheck.command = healthcheck.cmd;
  // merge in defaults and return
  return {...defaults, ...healthcheck};
};
