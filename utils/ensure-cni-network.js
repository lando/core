'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Ensure a CNI network conflist exists for a given network name.
 *
 * When using docker-compose via finch-daemon, networks are created at the
 * Docker API level but NOT at the CNI level. The nerdctl OCI hook needs
 * CNI configs to set up container networking. This utility creates the
 * conflist file if it doesn't already exist.
 *
 * @param {string} networkName - The network name (e.g. 'containerdtest_default').
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.cniNetconfPath='/etc/cni/net.d/finch'] - CNI config directory.
 * @param {Function} [opts.debug] - Debug logging function.
 * @returns {boolean} true if a conflist was created, false if it already existed.
 */
module.exports = (networkName, opts = {}) => {
  const cniNetconfPath = opts.cniNetconfPath || '/etc/cni/net.d/finch';
  const debug = opts.debug || (() => {});
  const conflistPath = path.join(cniNetconfPath, `nerdctl-${networkName}.conflist`);

  // Already exists — nothing to do
  if (fs.existsSync(conflistPath)) {
    debug('CNI conflist already exists for network %s', networkName);
    return false;
  }

  // Find the next available subnet by scanning existing configs
  let maxSubnet = 0;
  try {
    const files = fs.readdirSync(cniNetconfPath).filter(f => f.endsWith('.conflist'));
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(cniNetconfPath, file), 'utf8'));
        const plugins = content.plugins || [];
        for (const plugin of plugins) {
          const ranges = (plugin.ipam && plugin.ipam.ranges) || [];
          for (const range of ranges) {
            for (const r of range) {
              const match = (r.subnet || '').match(/^10\.4\.(\d+)\.0\/24$/);
              if (match) maxSubnet = Math.max(maxSubnet, parseInt(match[1], 10));
            }
          }
        }
      } catch { /* skip invalid configs */ }
    }
  } catch { /* directory doesn't exist or can't be read */ }

  const subnet = maxSubnet + 1;
  if (subnet > 255) {
    debug('no available subnets in 10.4.0.0/16 range for network %s', networkName);
    return false;
  }

  const nerdctlID = crypto.randomBytes(32).toString('hex');
  const bridgeName = `br-${nerdctlID.slice(0, 12)}`;

  const conflist = {
    cniVersion: '1.0.0',
    name: networkName,
    nerdctlID,
    nerdctlLabels: {},
    plugins: [
      {
        type: 'bridge',
        bridge: bridgeName,
        isGateway: true,
        ipMasq: true,
        hairpinMode: true,
        ipam: {
          ranges: [[{gateway: `10.4.${subnet}.1`, subnet: `10.4.${subnet}.0/24`}]],
          routes: [{dst: '0.0.0.0/0'}],
          type: 'host-local',
        },
      },
      {
        type: 'firewall',
      },
      {
        type: 'tc-redirect-tap',
      },
    ],
  };

  // Write atomically via temp file + rename to prevent concurrent processes
  // from reading a partially-written conflist
  const tmpPath = `${conflistPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(conflist, null, 2), 'utf8');
    fs.renameSync(tmpPath, conflistPath);
    debug('created CNI conflist for network %s at %s (subnet 10.4.%d.0/24)', networkName, conflistPath, subnet);
    return true;
  } catch (err) {
    // Clean up temp file on failure
    try { fs.unlinkSync(tmpPath); } catch {}

    // Permission errors must surface to the user — silent failure here leads
    // to cryptic container networking errors downstream
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      throw new Error(
        `Permission denied writing CNI config for network "${networkName}" at ${conflistPath}. `
        + 'Run "lando setup" to fix CNI directory permissions.',
      );
    }
    debug('failed to create CNI conflist for network %s: %s', networkName, err.message);
    return false;
  }
};
