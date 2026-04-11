'use strict';

// Host variables to forward when set. These provide terminal, locale,
// and CI context to whatever runs inside the container.
const forwardKeys = [
  'TERM', 'COLORTERM', 'TERM_PROGRAM',
  'NO_COLOR', 'FORCE_COLOR', 'CLICOLOR', 'CLICOLOR_FORCE',
  'LANG', 'LC_ALL', 'LC_CTYPE', 'LC_MESSAGES',
  'TZ',
  'CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI',
  'BUILDKITE', 'JENKINS_URL', 'TRAVIS',
  'DEBUG', 'VERBOSE',
];

const forceColorKeys = ['FORCE_COLOR', 'CLICOLOR_FORCE'];

/*
 * Builds the environment variables for a docker exec invocation.
 *
 * Three layers with explicit precedence:
 *   1. inherited — host vars forwarded when set
 *   2. synthetic — derived from context analysis (e.g. COLUMNS/LINES)
 *   3. userEnv   — explicit user overrides (always win)
 */
module.exports = (context, userEnv = {}) => {
  const hostEnv = context.env || process.env;
  const inherited = {};
  for (const key of forwardKeys) {
    if (hostEnv[key] === undefined) continue;

    // Redirected stdout should not inherit env vars that force color,
    // or they can bypass the no-TTY safeguard and reintroduce ANSI codes.
    if (!context.stdout.isTTY && forceColorKeys.includes(key)) continue;

    inherited[key] = hostEnv[key];
  }

  const synthetic = {};

  if (!context.stdout.isTTY) {
    // No PTY means no SIGWINCH, but a static hint is better than nothing
    synthetic.COLUMNS = String(context.stdout.columns);
    synthetic.LINES = String(context.stdout.rows);
  }

  return {...inherited, ...synthetic, ...userEnv};
};

// Expose for testing
module.exports.forwardKeys = forwardKeys;
