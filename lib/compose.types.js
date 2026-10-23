'use strict';

/**
 * @file Type definitions for {@link module:lib/compose}.
 */

/**
 * @typedef {object} ComposeRunOpts
 * @property {boolean} [detach] — run in detached mode
 * @property {string[]} [cmd] — command array to exec in the container
 * @property {boolean} [noTTY] — disable PTY allocation (computed from
 *   terminal state when not set explicitly)
 * @property {Record<string, string>} [environment] — env vars to inject
 * @property {string[]} [services] — target service name(s)
 * @property {string} [user] — user to run as inside the container
 * @property {string} [workdir] — working directory inside the container
 * @property {string[]} [entrypoint] — override container entrypoint
 * @property {string} [cstdio] — child stdio mode
 * @property {boolean} [silent] — suppress output
 */

/**
 * @typedef {object} ShellSpec
 * @property {string[]} cmd — the assembled docker-compose argv
 * @property {object} opts — options passed to shell.sh
 * @property {string} opts.mode — shell execution mode
 * @property {string} [opts.cstdio] — child stdio mode
 * @property {boolean} [opts.silent] — suppress output
 */

module.exports = {};
