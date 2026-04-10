'use strict';

/*
 * Extracts detach intent from a command array.
 *
 * Detects and removes a trailing '&' from the command, returning a
 * clean copy and a boolean indicating whether to detach. Works for
 * all command shapes: bare commands, shell wrappers (sh -c / bash -c),
 * and /etc/lando/exec.sh invocations.
 *
 * The previous implementation had separate branches for each wrapper
 * type, but in every case the '&' was either the last element or
 * appended to the last element. This normalizes that in one place.
 */
module.exports = cmd => {
  const parts = [...cmd];
  let detach = false;

  if (parts.length === 0) return {cmd: parts, detach};

  // Trailing bare '&'
  if (parts[parts.length - 1] === '&') {
    parts.pop();
    detach = true;
  // '&' appended to the last argument
  } else if (parts[parts.length - 1].endsWith('&')) {
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1).trim();
    detach = true;
  }

  return {cmd: parts, detach};
};
