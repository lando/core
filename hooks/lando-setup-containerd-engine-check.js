"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Pre-flight check hook: warns if containerd engine binaries are missing.
 *
 * Runs on every Lando startup when `engine: containerd` is set.
 * Binaries installed by `lando setup` live in two locations:
 * - **System binaries** (`containerd`, `buildkitd`, `runc`): `/usr/local/lib/lando/bin/`
 *   (requires root to install, owned by the systemd service)
 * - **User binaries** (`nerdctl`, `docker-compose`): `~/.lando/bin/`
 *   (installed per-user, no root required after setup)
 *
 * @param {Object} lando - The Lando app instance.
 * @returns {void}
 */
module.exports = async (lando) => {
  const engine = lando.config.engine || "auto";
  // Only check when engine is explicitly containerd
  if (engine !== "containerd") return;

  const userConfRoot = lando.config.userConfRoot || path.join(os.homedir(), ".lando");
  const userBinDir = path.join(userConfRoot, "bin");
  const systemBinDir = lando.config.containerdSystemBinDir || "/usr/local/lib/lando/bin";

  const composeVersion = lando.config.orchestratorVersion || '2.31.0';
  const missing = [];
  const bins = {
    containerd: lando.config.containerdBin || path.join(systemBinDir, 'containerd'),
    buildkitd: lando.config.buildkitdBin || path.join(systemBinDir, 'buildkitd'),
    runc: lando.config.runcBin || path.join(systemBinDir, 'runc'),
    nerdctl: lando.config.nerdctlBin || path.join(userBinDir, 'nerdctl'),
    'docker-compose': lando.config.orchestratorBin
      || path.join(userBinDir, `docker-compose-v${composeVersion}`),
  };

  for (const [name, binPath] of Object.entries(bins)) {
    if (!fs.existsSync(binPath)) missing.push(name);
  }

  if (missing.length > 0) {
    lando.log.warn(
      "containerd engine selected but missing binaries: %s. Run \"lando setup\" to install them.",
      missing.join(", "),
    );
  }
};
