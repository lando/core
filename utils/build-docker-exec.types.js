'use strict';

/**
 * @file Type definitions for {@link module:utils/build-docker-exec}.
 */

/**
 * @typedef {object} ExecDatumOpts
 * @property {string} [workdir] — working directory inside the container
 * @property {string} user — user to run as inside the container
 * @property {Record<string, string>} [environment] — caller-provided env overrides
 */

/**
 * @typedef {object} ExecDatum
 * @property {string[]} cmd — the command to execute
 * @property {string} id — target container id
 * @property {ExecDatumOpts} opts
 */

module.exports = {};
