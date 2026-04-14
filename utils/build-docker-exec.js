'use strict';

const describeContext = require('./describe-context');
const extractDetach = require('./extract-detach');
const buildEnvironment = require('./build-exec-environment');

/*
 * Builds the docker exec argument array.
 *
 * Each concern — TTY allocation, interactive mode, detach detection,
 * environment propagation — reads from the context object rather than
 * from process globals directly. This makes every decision testable
 * with plain objects.
 */
const buildExecArgs = (docker, datum, context) => {
  const args = [docker, 'exec'];
  const {cmd, detach} = extractDetach(datum.cmd);

  if (detach) {
    args.push('--detach');
  } else {
    // Allocate a PTY only when both sides are real terminals and
    // we're not detaching (detach + tty is nonsensical)
    if (context.stdin.isTTY && context.stdout.isTTY) {
      args.push('--tty');
    }

    // Keep stdin open when running in node mode and stdin isn't closed.
    // Skip when detaching — there's no stdin to attach to.
    if (context.isNodeMode && !context.stdin.isClosed) {
      args.push('--interactive');
    }
  }

  if (datum.opts.workdir) {
    args.push('--workdir', datum.opts.workdir);
  }

  args.push('--user', datum.opts.user);

  const env = buildEnvironment(context, datum.opts.environment);
  for (const [key, value] of Object.entries(env)) {
    args.push('--env', `${key}=${value}`);
  }

  args.push(datum.id);
  args.push(...cmd);

  return args;
};

module.exports = (injected, stdio, datum = {}) => {
  const dockerBin = injected.config.dockerBin || injected._config.dockerBin;
  const context = describeContext();
  const args = buildExecArgs(dockerBin, datum, context);

  // Write the cleaned command back to datum so callers that reuse the
  // same object (e.g. build-tooling-task.js compose fallback) see it
  // without the trailing '&'.  This preserves the mutation contract
  // the old getExecOpts() relied on.
  datum.cmd = extractDetach(datum.cmd).cmd;

  return injected.shell.sh(args, {mode: 'attach', cstdio: stdio});
};

// Expose internals for testing
module.exports.buildExecArgs = buildExecArgs;
