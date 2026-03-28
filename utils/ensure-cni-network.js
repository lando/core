'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * The expected CNI plugin types in the correct order.
 * Used both for new conflist creation and for migrating stale configs.
 *
 * Plugin chain:
 * - bridge: Creates Linux bridge, assigns IP via IPAM, enables MASQUERADE
 * - portmap: Maps container ports to host ports (capabilities-based)
 * - firewall: Manages iptables FORWARD rules for container traffic
 * - tuning: Allows sysctl and interface tuning on the container veth
 *
 * NOTE: tc-redirect-tap was previously included but is NOT installed by
 * `lando setup` (it's from github.com/awslabs/tc-redirect-tap, not
 * the standard containernetworking/plugins release). It's only needed
 * for VM-based runtimes (Kata, Firecracker), not standard runc containers.
 *
 * @type {string[]}
 */
const EXPECTED_PLUGIN_TYPES = ['bridge', 'portmap', 'firewall', 'tuning'];

/**
 * Build the standard CNI plugin array for a Lando network conflist.
 *
 * @param {string} bridgeName - The Linux bridge device name (e.g. 'br-abcdef012345').
 * @param {number} subnet - The third octet for the 10.4.x.0/24 subnet.
 * @returns {Object[]} Array of CNI plugin config objects.
 */
const buildPlugins = (bridgeName, subnet) => [
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
    type: 'portmap',
    capabilities: {portMappings: true},
  },
  {
    type: 'firewall',
  },
  {
    type: 'tuning',
  },
];

/**
 * Check whether an existing conflist has the expected plugin chain.
 * Returns false if the conflist uses the old plugin chain (e.g. with
 * tc-redirect-tap) or is missing expected plugins (e.g. portmap, tuning).
 *
 * @param {Object} conflist - Parsed conflist JSON.
 * @returns {boolean} true if the plugin chain matches EXPECTED_PLUGIN_TYPES.
 */
const hasExpectedPlugins = (conflist) => {
  if (!conflist || !Array.isArray(conflist.plugins)) return false;
  const types = conflist.plugins.map(p => p.type);
  if (types.length !== EXPECTED_PLUGIN_TYPES.length) return false;
  return EXPECTED_PLUGIN_TYPES.every((t, i) => types[i] === t);
};

/**
 * Ensure a CNI network conflist exists for a given network name.
 *
 * When using docker-compose via finch-daemon, networks are created at the
 * Docker API level but NOT at the CNI level. The nerdctl OCI hook needs
 * CNI configs to set up container networking. This utility creates the
 * conflist file if it doesn't already exist.
 *
 * If a conflist already exists but uses a stale plugin chain (e.g. the old
 * tc-redirect-tap chain), it is rewritten in-place with the correct plugins
 * while preserving the subnet, bridge name, and nerdctlID.
 *
 * @param {string} networkName - The network name (e.g. 'containerdtest_default').
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.cniNetconfPath='/etc/lando/cni/finch'] - CNI config directory.
 * @param {Function} [opts.debug] - Debug logging function.
 * @returns {boolean} true if a conflist was created or updated, false if it already existed and was up-to-date.
 */
module.exports = (networkName, opts = {}) => {
  const cniNetconfPath = opts.cniNetconfPath || '/etc/lando/cni/finch';
  const debug = opts.debug || (() => {});
  const conflistPath = path.join(cniNetconfPath, `nerdctl-${networkName}.conflist`);

  // If the conflist exists, check if it needs migration
  if (fs.existsSync(conflistPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(conflistPath, 'utf8'));
      if (hasExpectedPlugins(existing)) {
        debug('CNI conflist already exists and is up-to-date for network %s', networkName);
        return false;
      }

      // Stale conflist — migrate in-place preserving subnet/bridge/nerdctlID
      debug('CNI conflist for network %s has stale plugin chain, migrating', networkName);
      const bridgePlugin = (existing.plugins || []).find(p => p.type === 'bridge');
      const bridgeName = bridgePlugin ? bridgePlugin.bridge : `br-${(existing.nerdctlID || crypto.randomBytes(32).toString('hex')).slice(0, 12)}`;
      const ipamRanges = bridgePlugin && bridgePlugin.ipam && bridgePlugin.ipam.ranges;
      const subnetMatch = ipamRanges && ipamRanges[0] && ipamRanges[0][0] && (ipamRanges[0][0].subnet || '').match(/^10\.4\.(\d+)\.0\/24$/);
      const existingSubnet = subnetMatch ? parseInt(subnetMatch[1], 10) : 1;

      const updated = {
        ...existing,
        plugins: buildPlugins(bridgeName, existingSubnet),
      };

      const tmpPath = `${conflistPath}.${process.pid}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), 'utf8');
      fs.renameSync(tmpPath, conflistPath);
      debug('migrated CNI conflist for network %s (preserved subnet 10.4.%d.0/24)', networkName, existingSubnet);
      return true;
    } catch (err) {
      // If we can't read/parse the existing file, fall through to re-create
      debug('failed to read existing CNI conflist for network %s: %s', networkName, err.message);
    }
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
    plugins: buildPlugins(bridgeName, subnet),
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
