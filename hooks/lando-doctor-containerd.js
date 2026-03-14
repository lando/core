"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

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
  const runDir = path.join(userConfRoot, "run");

  const bins = {
    containerd: lando.config.containerdBin || path.join(binDir, "containerd"),
    nerdctl: lando.config.nerdctlBin || path.join(binDir, "nerdctl"),
    buildkitd: lando.config.buildkitdBin || path.join(binDir, "buildkitd"),
    "finch-daemon": lando.config.finchDaemonBin || path.join(binDir, "finch-daemon"),
  };

  const sockets = {
    containerd: lando.config.containerdSocket || path.join(runDir, "containerd.sock"),
    buildkitd: path.join(runDir, "buildkitd.sock"),
    "finch-daemon": lando.config.finchDaemonSocket || path.join(runDir, "finch.sock"),
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

  // Check nerdctl connectivity
  try {
    const nerdctlBin = bins.nerdctl;
    const socketPath = sockets.containerd;
    // Only attempt connectivity check if the binary exists
    if (fs.existsSync(nerdctlBin)) {
      const runCommand = require("../utils/run-command");
      await runCommand(nerdctlBin, ["--address", socketPath, "ps"], {debug: () => {}});
      checks.push({title: "nerdctl connectivity", status: "ok", message: "nerdctl can reach containerd"});
    } else {
      checks.push({title: "nerdctl connectivity", status: "error", message: `nerdctl binary not found at ${nerdctlBin}`});
    }
  } catch (err) {
    checks.push({title: "nerdctl connectivity", status: "error", message: `nerdctl cannot reach containerd: ${err.message}`});
  }

  return checks;
};

module.exports = runChecks;
