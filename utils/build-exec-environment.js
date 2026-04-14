'use strict';

// Host variables to forward when set.  Terminal type and locale
// provide context so tools inside the container produce appropriate
// output; TZ keeps timestamps consistent with the host.
const forwardKeys = [
  'TERM', 'COLORTERM', 'TERM_PROGRAM',
  'LANG', 'LC_ALL', 'LC_CTYPE', 'LC_MESSAGES',
  'TZ',
];

/*
 * Builds the environment variables for a docker exec invocation.
 *
 * Three layers with explicit precedence:
 *   1. inherited — host vars forwarded when set
 *   2. synthetic — derived from context analysis (e.g. COLUMNS/LINES,
 *      color suppression when Lando itself is not producing color)
 *   3. userEnv   — explicit user overrides (always win)
 */
module.exports = (context, userEnv = {}) => {
  const hostEnv = context.env || process.env;
  const inherited = {};
  for (const key of forwardKeys) {
    if (hostEnv[key] === undefined) continue;
    inherited[key] = hostEnv[key];
  }

  const synthetic = {};

  // When Lando itself isn't producing colorful output, tell containers
  // not to either.  context.landoColorLevel mirrors chalk.level which
  // already accounts for NO_COLOR, FORCE_COLOR, TERM=dumb, TTY state,
  // and every other signal the host uses to decide on color support.
  if (context.landoColorLevel === 0) {
    synthetic.NO_COLOR = '1';
  }

  if (!(context.stdin.isTTY && context.stdout.isTTY)) {
    // No PTY means no SIGWINCH, but a static hint is better than nothing
    synthetic.COLUMNS = String(context.stdout.columns);
    synthetic.LINES = String(context.stdout.rows);
  }

  return {...inherited, ...synthetic, ...userEnv};
};

// Expose for testing
module.exports.forwardKeys = forwardKeys;
