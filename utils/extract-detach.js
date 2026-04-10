'use strict';

/*
 * Extracts detach intent from a command array.
 *
 * Detects and removes detach syntax from the command, returning a
 * clean copy and a boolean indicating whether to detach.
 *
 * A bare trailing '&' is only meaningful as shell syntax, so we accept
 * it for all command shapes. An appended '&' is only shell syntax for
 * wrapper-style commands where the final command is itself a shell
 * string (`sh -c`, `bash -c`, or `/etc/lando/exec.sh`). For plain argv
 * commands, a trailing '&' can be literal data and must be preserved.
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
  // '&' appended to a shell string inside a wrapper command
  } else if (parts[0] === '/etc/lando/exec.sh' && parts[parts.length - 1] && parts[parts.length - 1].endsWith('&')) {
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1).trim();
    detach = true;
  } else if (parts[0] && parts[0].endsWith('sh') && parts[1] === '-c' && parts[2] && parts[2].endsWith('&')) {
    parts[2] = parts[2].slice(0, -1).trim();
    detach = true;
  }

  return {cmd: parts, detach};
};
