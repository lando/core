'use strict';

const chalk = require('chalk');

/*
 * Describes the current execution context as a plain object.
 *
 * Every decision downstream reads from this object instead of from
 * `process` directly. That single change makes the whole exec builder
 * deterministic and testable with plain objects.
 */
module.exports = () => ({
  stdin: {
    isTTY: Boolean(process.stdin.isTTY),
    isClosed: process.stdin.readableEnded || false,
  },
  stdout: {
    isTTY: Boolean(process.stdout.isTTY),
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  },
  stderr: {
    isTTY: Boolean(process.stderr.isTTY),
  },
  env: process.env,
  isNodeMode: process.lando === 'node',
  ci: Boolean(process.env.CI),
  // chalk.level: 0=none, 1=basic, 2=256, 3=truecolor.
  // Reflects whether Lando itself is producing colorful output.
  // chalk already accounts for NO_COLOR, FORCE_COLOR, TERM=dumb,
  // TTY state, etc. so downstream code can treat this as the single
  // source of truth for color support.
  landoColorLevel: chalk.level,
});
