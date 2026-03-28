'use strict';

/**
 * Remove project networks that exist without docker-compose labels.
 *
 * **Why this is needed**: finch-daemon does not persist Docker API network
 * labels (including `com.docker.compose.*`) across daemon restarts. When the
 * `lando-containerd.service` restarts, all networks lose their labels.
 * docker-compose v2 validates that existing networks have the correct
 * `com.docker.compose.network` label and refuses to start if it doesn't
 * match (error: "network was not created by compose").
 *
 * This utility removes project networks that lack compose labels so that
 * `docker-compose up` can recreate them with proper labels. Only networks
 * with no connected containers are removed (safe for stopped containers;
 * running containers are left untouched).
 *
 * @param {Object} dockerode - Dockerode instance pointed at finch-daemon.
 * @param {string} project - The compose project name (e.g. 'landocontainerd').
 * @param {Function} [debug] - Debug logging function.
 * @return {Promise<string[]>} Names of removed networks.
 */
module.exports = async (dockerode, project, debug = () => {}) => {
  const removed = [];

  /** @type {Array<{Name: string, Id: string, Labels: Object}>} */
  let nets;
  try {
    nets = await dockerode.listNetworks();
  } catch (err) {
    debug('failed to list networks for stale cleanup: %s', err.message);
    return removed;
  }

  const projectPrefix = `${project}_`;

  for (const net of nets) {
    // Only consider networks belonging to this project
    if (!net.Name || !net.Name.startsWith(projectPrefix)) continue;

    // If the network already has compose labels, docker-compose will accept it
    const labels = net.Labels || {};
    if (labels['com.docker.compose.project']) continue;

    // Safety check: don't remove networks with connected containers
    try {
      const info = await dockerode.getNetwork(net.Id || net.Name).inspect();
      const containers = info.Containers || {};
      if (Object.keys(containers).length > 0) {
        debug('skipping removal of stale network %s — has %d connected containers',
          net.Name, Object.keys(containers).length);
        continue;
      }
    } catch (err) {
      // If inspect fails, skip this network rather than risk removing it
      debug('failed to inspect network %s, skipping: %s', net.Name, err.message);
      continue;
    }

    try {
      debug('removing stale network %s (no compose labels)', net.Name);
      await dockerode.getNetwork(net.Id || net.Name).remove();
      removed.push(net.Name);
    } catch (err) {
      debug('failed to remove stale network %s: %s', net.Name, err.message);
    }
  }

  if (removed.length > 0) {
    debug('removed %d stale project networks: %s', removed.length, removed.join(', '));
  }

  return removed;
};
