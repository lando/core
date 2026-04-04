"use strict";

const {execSync} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const getContainerdPaths = require('../utils/get-containerd-paths');
const getComposeX = require('../utils/get-compose-x');

/**
 * Check whether a binary exists — either as an absolute path or on $PATH.
 *
 * @param {string} bin - Absolute path or bare command name.
 * @returns {boolean}
 * @private
 */
const binExists = bin => {
  if (path.isAbsolute(bin)) return fs.existsSync(bin);
  try {
    execSync(`command -v ${bin}`, {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
};

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
  const systemBinDir = lando.config.containerdSystemBinDir || '/usr/local/lib/lando/bin';
  const paths = getContainerdPaths(lando.config);
  const orchestratorBin = lando.config.orchestratorBin
    || getComposeX({...lando.config, userConfRoot})
    || 'docker-compose';

  // Per BRIEF: nerdctl is only used internally by OCI runtime hooks (invoked
  // as root by systemd). It is NOT a user-facing dependency, so we don't
  // check for it here.
  const bins = {
    containerd: lando.config.containerdBin || path.join(systemBinDir, "containerd"),
    buildkitd: lando.config.buildkitdBin || path.join(systemBinDir, "buildkitd"),
    "finch-daemon": lando.config.finchDaemonBin || path.join(systemBinDir, "finch-daemon"),
    "docker-compose": orchestratorBin,
  };

  const sockets = {
    containerd: paths.containerdSocket,
    buildkitd: paths.buildkitSocket,
    "finch-daemon": paths.finchSocket,
  };

  // Check binaries
  for (const [name, bin] of Object.entries(bins)) {
    const exists = binExists(bin);
    checks.push({
      title: `${name} binary`,
      status: exists ? "ok" : "error",
      message: exists ? `Found at ${bin}` : `Not found at ${bin}. Run "lando setup" to install.`,
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

  // Check CNI directory permissions on Linux/WSL-native installs only.
  // macOS uses Lima, so the host should not have this Linux CNI path.
  if (process.platform === 'linux') {
    const cniDir = '/etc/lando/cni/finch';
    try {
      const cniStats = fs.statSync(cniDir);
      const isGroupWritable = (cniStats.mode & 0o020) !== 0;
      if (isGroupWritable) {
        checks.push({
          title: 'CNI directory permissions',
          status: 'ok',
          message: `${cniDir} is group-writable`,
        });
      } else {
        checks.push({
          title: 'CNI directory permissions',
          status: 'error',
          message: `${cniDir} is not group-writable. Run "lando setup" to fix permissions.`,
        });
      }
    } catch {
      checks.push({
        title: 'CNI directory permissions',
        status: 'error',
        message: `${cniDir} does not exist. Run "lando setup" to create it.`,
      });
    }
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
