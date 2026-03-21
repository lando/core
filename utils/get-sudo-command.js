'use strict';

/**
 * Get the sudo command prefix for running a command with elevated privileges.
 *
 * Uses `sudo -n` (non-interactive) which requires passwordless sudo to be
 * configured for the current user (e.g. via NOPASSWD in sudoers).
 *
 * @param {...string} cmd - Command and arguments to prefix with sudo.
 * @return {string[]} The command array prefixed with sudo -n.
 */
module.exports = (...cmd) => ['sudo', '-n', ...cmd];
