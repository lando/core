'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

const ensureCniNetwork = require('./ensure-cni-network');

/**
 * Ensure CNI network conflist files exist for ALL networks that docker-compose
 * will create from a set of compose files.
 *
 * When using docker-compose via finch-daemon, networks are created at the
 * Docker API level but NOT at the CNI level. The nerdctl OCI runtime hook
 * needs CNI conflist files for container networking to work. This utility
 * parses the compose YAML files, resolves docker-compose-style network names,
 * and pre-creates CNI configs for each one.
 *
 * This covers the gap where only `${project}_default` was handled previously.
 * Custom networks defined in compose files (e.g. `edge`, `backend`, etc.)
 * now get CNI configs too.
 *
 * @param {string[]} composeFiles - Array of paths to compose YAML files.
 * @param {string} project - The compose project name (e.g. 'myapp').
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.cniNetconfPath] - CNI config directory (passed to ensureCniNetwork).
 * @param {Function} [opts.debug] - Debug logging function.
 * @returns {string[]} Array of network names for which CNI configs were ensured.
 */
module.exports = (composeFiles, project, opts = {}) => {
  const debug = opts.debug || (() => {});
  const ensuredNetworks = [];

  // Always ensure the implicit _default network — docker-compose creates
  // this even when no networks are explicitly defined in compose files.
  const defaultNet = `${project}_default`;
  ensureCniNetwork(defaultNet, opts);
  ensuredNetworks.push(defaultNet);

  // Collect network definitions from all compose files.
  // docker-compose merges networks across multiple files, so we do the same.
  /** @type {Object<string, Object>} */
  const allNetworks = {};

  for (const file of composeFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const doc = yaml.load(content);
      if (doc && doc.networks && typeof doc.networks === 'object') {
        for (const [name, config] of Object.entries(doc.networks)) {
          // Later files override earlier ones (same as docker-compose merge)
          allNetworks[name] = config || {};
        }
      }
    } catch (err) {
      // Log but don't fail — missing or invalid compose files will be caught
      // by docker-compose itself with a better error message.
      debug('failed to parse compose file %s for CNI network extraction: %s', file, err.message);
    }
  }

  // Ensure CNI configs for each non-external network
  for (const [name, config] of Object.entries(allNetworks)) {
    // External networks are managed elsewhere — not created by docker-compose.
    // docker-compose treats any truthy `external` value as external (boolean or object with name).
    if (config.external) {
      debug('skipping external network %s for CNI config', name);
      continue;
    }

    // Resolve the actual network name docker-compose will create:
    // - If the network has an explicit `name:` property, docker-compose uses it as-is
    // - Otherwise, docker-compose prefixes with `${project}_`
    const resolvedName = config.name || `${project}_${name}`;

    // Skip if already ensured (e.g. if the default network is also explicitly defined)
    if (ensuredNetworks.includes(resolvedName)) {
      continue;
    }

    debug('ensuring CNI config for compose network %s (resolved: %s)', name, resolvedName);
    ensureCniNetwork(resolvedName, opts);
    ensuredNetworks.push(resolvedName);
  }

  debug('ensured CNI configs for %d networks: %s', ensuredNetworks.length, ensuredNetworks.join(', '));
  return ensuredNetworks;
};
