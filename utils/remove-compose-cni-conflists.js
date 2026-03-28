'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Remove CNI conflist files for a project's networks.
 *
 * This clears conflist files so finch-daemon doesn't auto-report Docker API
 * networks (without compose labels) when `listNetworks` is called. After
 * removal, docker-compose can create networks fresh with proper compose labels,
 * and finch-daemon will write new conflist files for them.
 *
 * @param {string[]} composeFiles - Array of paths to compose YAML files.
 * @param {string} project - The compose project name.
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.cniNetconfPath='/etc/lando/cni/finch'] - CNI config directory.
 * @param {Function} [opts.debug] - Debug logging function.
 * @return {string[]} Array of removed conflist file paths.
 */
module.exports = (composeFiles, project, opts = {}) => {
  const cniNetconfPath = opts.cniNetconfPath || '/etc/lando/cni/finch';
  const debug = opts.debug || (() => {});
  const removed = [];

  // Collect all network names this project uses
  const networkNames = new Set();
  networkNames.add(`${project}_default`);

  for (const file of composeFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const doc = yaml.load(content);
      if (doc && doc.networks && typeof doc.networks === 'object') {
        for (const [name, config] of Object.entries(doc.networks)) {
          const cfg = config || {};
          if (cfg.external) continue;
          const resolvedName = cfg.name || `${project}_${name}`;
          networkNames.add(resolvedName);
        }
      }
    } catch (err) {
      debug('failed to parse compose file %s for CNI conflist removal: %s', file, err.message);
    }
  }

  // Remove conflist files for each network
  for (const name of networkNames) {
    const conflistPath = path.join(cniNetconfPath, `nerdctl-${name}.conflist`);
    try {
      if (fs.existsSync(conflistPath)) {
        fs.unlinkSync(conflistPath);
        removed.push(conflistPath);
        debug('removed CNI conflist %s', conflistPath);
      }
    } catch (err) {
      debug('failed to remove CNI conflist %s: %s', conflistPath, err.message);
    }
  }

  return removed;
};
