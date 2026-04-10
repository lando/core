'use strict';

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
  isNodeMode: process.lando === 'node',
  ci: Boolean(process.env.CI),
  noColor: process.env.NO_COLOR !== undefined,
  forceColor: process.env.FORCE_COLOR,
});
