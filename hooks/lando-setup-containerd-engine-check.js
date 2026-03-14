"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

module.exports = async (lando) => {
  const engine = lando.config.engine || "auto";
  // Only check when engine is explicitly containerd
  if (engine !== "containerd") return;

  const userConfRoot = lando.config.userConfRoot || path.join(os.homedir(), ".lando");
  const binDir = path.join(userConfRoot, "bin");

  const missing = [];
  const bins = {
    containerd: lando.config.containerdBin || path.join(binDir, "containerd"),
    nerdctl: lando.config.nerdctlBin || path.join(binDir, "nerdctl"),
    buildkitd: lando.config.buildkitdBin || path.join(binDir, "buildkitd"),
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
