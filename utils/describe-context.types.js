'use strict';

/**
 * @file Type definitions for {@link module:utils/describe-context}.
 */

/**
 * @typedef {object} StdinContext
 * @property {boolean} isTTY — whether stdin is connected to a terminal
 * @property {boolean} isClosed — whether the readable side has already ended
 */

/**
 * @typedef {object} StdoutContext
 * @property {boolean} isTTY — whether stdout is connected to a terminal
 * @property {number} columns — terminal width (defaults to 80 when not a TTY)
 * @property {number} rows — terminal height (defaults to 24 when not a TTY)
 */

/**
 * @typedef {object} StderrContext
 * @property {boolean} isTTY — whether stderr is connected to a terminal
 */

/**
 * @typedef {object} ExecutionContext
 * @property {StdinContext} stdin
 * @property {StdoutContext} stdout
 * @property {StderrContext} stderr
 * @property {Record<string, string | undefined>} env — host environment variables
 * @property {boolean} isNodeMode — true when `process.lando === 'node'`
 * @property {boolean} ci — true when the CI env var is set
 * @property {0 | 1 | 2 | 3} landoColorLevel — chalk color level
 *   (0 = none, 1 = basic, 2 = 256-color, 3 = truecolor).
 *   Reflects whether Lando itself is producing colorful output.
 *   chalk already accounts for NO_COLOR, FORCE_COLOR, TERM=dumb,
 *   TTY state, etc. so downstream code can treat this as the single
 *   source of truth for color support.
 */

module.exports = {};
