"use strict";

module.exports = async lando => {
  // Only run for containerd backend
  if (!lando.engine || lando.engine.engineBackend !== "containerd") return;

  try {
    const versions = await lando.engine.daemon.getVersions();
    lando.log.debug("containerd versions: %o", versions);

    // Add to lando.versions alongside any Docker version info
    if (!lando.versions) lando.versions = [];

    for (const [name, version] of Object.entries(versions)) {
      if (!version) continue;
      lando.versions.push({
        name,
        version,
        dockerVersion: false,
        satisfied: true,
      });
    }
  } catch (err) {
    lando.log.warn("could not retrieve containerd version info: %s", err.message);
  }
};
