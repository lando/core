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

  // Check wrapper-specific patterns first to handle edge cases correctly
  if (parts[0] === '/etc/lando/exec.sh' && parts[parts.length - 1] === '&') {
    // Bare '&' after exec.sh wrapper
    parts.pop();
    detach = true;
  } else if (parts[0] === '/etc/lando/exec.sh' && parts[parts.length - 1] && parts[parts.length - 1].endsWith('&')) {
    // '&' appended to last argument in exec.sh wrapper
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1).trim();
    detach = true;
  } else if (parts[0] && parts[0].endsWith('sh') && parts[1] === '-c' && parts[2] && parts[2].endsWith('&')) {
    // '&' appended to shell string in sh/bash -c wrapper
    parts[2] = parts[2].slice(0, -1).trim();
    detach = true;
  } else if (parts[parts.length - 1] === '&') {
    // Trailing bare '&' for all other commands
    parts.pop();
    detach = true;
  }

  return {cmd: parts, detach};
};
