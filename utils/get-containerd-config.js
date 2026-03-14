'use strict';

/**
 * Generate a containerd TOML configuration string.
 *
 * This is the shared config generator used by the containerd daemon manager
 * on all platforms (Linux, WSL, macOS/Lima). It produces a minimal config
 * that isolates Lando's containerd instance from any other container runtime
 * on the host.
 *
 * @param {Object} [opts={}] - Configuration options.
 * @param {string} [opts.socketPath="/run/lando/containerd.sock"] - containerd gRPC socket address.
 * @param {string} [opts.stateDir="/var/lib/lando/containerd"] - containerd state directory.
 * @param {string} [opts.rootDir="/var/lib/lando/containerd/root"] - containerd root directory.
 * @param {boolean} [opts.debug=false] - Enable debug-level logging.
 * @param {string} [opts.snapshotter="overlayfs"] - Snapshotter plugin name.
 * @param {boolean} [opts.disableCri=true] - Disable the CRI plugin (saves resources).
 * @param {string} [opts.platform] - Override platform detection (for testing).
 * @returns {string} TOML configuration content.
 *
 * @since 4.0.0
 * @example
 * const getContainerdConfig = require('../utils/get-containerd-config');
 * const config = getContainerdConfig({socketPath: '/run/lando/containerd.sock'});
 * fs.writeFileSync('/path/to/config.toml', config, 'utf8');
 */
module.exports = (opts = {}) => {
  const socketPath = opts.socketPath || '/run/lando/containerd.sock';
  const stateDir = opts.stateDir || '/var/lib/lando/containerd';
  const rootDir = opts.rootDir || '/var/lib/lando/containerd/root';
  const debug = opts.debug || false;
  const snapshotter = opts.snapshotter || 'overlayfs';
  const disableCri = opts.disableCri !== false; // default true
  const platform = opts.platform || process.platform;

  // Top-level keys MUST come before any [section] in TOML
  const lines = [
    '# Lando containerd configuration',
    '# Auto-generated — do not edit manually',
    'version = 3',
    `root = "${rootDir}"`,
    `state = "${stateDir}"`,
  ];

  // Disable CRI plugin (not needed for Lando — saves resources)
  if (disableCri) {
    lines.push('disabled_plugins = ["io.containerd.grpc.v1.cri"]');
  }

  lines.push('');

  // Sections
  lines.push('[grpc]');
  lines.push(`  address = "${socketPath}"`);
  lines.push('');

  // ttrpc socket must also be redirected to avoid /run/containerd permission errors
  const ttrpcSocket = socketPath.replace(/containerd\.sock$/, 'containerd-ttrpc.sock');
  lines.push('[ttrpc]');
  lines.push(`  address = "${ttrpcSocket}"`);
  lines.push('');

  // Debug logging
  if (debug) {
    lines.push('[debug]');
    lines.push('  level = "debug"');
    lines.push('');
  }

  // Snapshotter config
  lines.push('[plugins]');
  lines.push(`  [plugins."io.containerd.snapshotter.v1.${snapshotter}"]`);
  lines.push(`    root_path = "${rootDir}/snapshots"`);
  lines.push('');

  return lines.join('\n');
};
