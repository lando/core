"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const getContainerdPaths = require('../utils/get-containerd-paths');

/**
 * Run containerd engine health checks.
 *
 * Returns an array of check result objects, each with:
 * - title: string — what was checked
 * - status: "ok" | "warning" | "error" — result
 * - message: string — human-readable description
 *
 * @param {Object} lando - The Lando instance.
 * @returns {Promise<Array<{title: string, status: string, message: string}>>}
 */
const runChecks = async (lando) => {
  const checks = [];
  const userConfRoot = lando.config.userConfRoot || path.join(os.homedir(), ".lando");
  const binDir = path.join(userConfRoot, "bin");
  const paths = getContainerdPaths(lando.config);

  const bins = {
    containerd: lando.config.containerdBin || path.join(binDir, "containerd"),
    nerdctl: lando.config.nerdctlBin || path.join(binDir, "nerdctl"),
    buildkitd: lando.config.buildkitdBin || path.join(binDir, "buildkitd"),
    "finch-daemon": lando.config.finchDaemonBin || path.join(binDir, "finch-daemon"),
  };

  const sockets = {
    containerd: paths.containerdSocket,
    buildkitd: paths.buildkitSocket,
    "finch-daemon": paths.finchSocket,
  };

  // Check binaries
  for (const [name, binPath] of Object.entries(bins)) {
    const exists = fs.existsSync(binPath);
    checks.push({
      title: `${name} binary`,
      status: exists ? "ok" : "error",
      message: exists ? `Found at ${binPath}` : `Not found at ${binPath}. Run "lando setup" to install.`,
    });
  }

  // Check sockets (daemon running)
  for (const [name, socketPath] of Object.entries(sockets)) {
    const exists = fs.existsSync(socketPath);
    checks.push({
      title: `${name} daemon`,
      status: exists ? "ok" : "warning",
      message: exists ? `Socket active at ${socketPath}` : `Socket not found at ${socketPath}. Daemon may not be running.`,
    });
  }

  // Check finch-daemon connectivity via Dockerode (Docker API)
  // Per BRIEF: never shell out to nerdctl from user-facing code.
  // finch-daemon provides Docker API compatibility, so we ping it instead.
  try {
    const finchSocket = sockets['finch-daemon'];
    if (fs.existsSync(finchSocket)) {
      const Dockerode = require('dockerode');
      const docker = new Dockerode({socketPath: finchSocket});
      await docker.ping();
      checks.push({title: "finch-daemon connectivity", status: "ok", message: "finch-daemon Docker API is responding"});
    } else {
      checks.push({title: "finch-daemon connectivity", status: "warning", message: `finch-daemon socket not found at ${finchSocket}. Daemon may not be running.`});
    }
  } catch (err) {
    checks.push({title: "finch-daemon connectivity", status: "error", message: `finch-daemon is not responding: ${err.message}`});
  }

  return checks;
};

module.exports = runChecks;
