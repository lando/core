'use strict';

/**
 * Generate a BuildKit TOML configuration string.
 *
 * This is the config generator for the buildkitd daemon that Lando manages
 * alongside containerd. It produces a config that uses the containerd worker
 * (not OCI), sets up garbage collection policies, and optionally configures
 * registry mirrors.
 *
 * @param {Object} [opts={}] - Configuration options.
 * @param {string} [opts.containerdSocket="/run/lando/containerd.sock"] - containerd gRPC socket address.
 * @param {string} [opts.buildkitSocket] - buildkitd gRPC listen address (unix socket path). If provided, a [grpc] section is added.
 * @param {string} [opts.cacheDir="/var/lib/lando/buildkit"] - BuildKit cache directory.
 * @param {number} [opts.gcMaxBytes=10737418240] - Max bytes for GC policy (default 10GB).
 * @param {number} [opts.parallelism] - Max parallelism for builds (default: CPU count).
 * @param {boolean} [opts.debug=false] - Enable debug-level logging.
 * @param {Object} [opts.registryMirrors={}] - Registry mirror map, e.g. {"docker.io": "https://mirror.example.com"}.
 * @returns {string} TOML configuration content.
 *
 * @since 4.0.0
 * @example
 * const getBuildkitConfig = require('../utils/get-buildkit-config');
 * const config = getBuildkitConfig({containerdSocket: '/run/lando/containerd.sock'});
 * fs.writeFileSync('/path/to/buildkit-config.toml', config, 'utf8');
 */
module.exports = (opts = {}) => {
  const os = require('os');
  const containerdSocket = opts.containerdSocket || '/run/lando/containerd.sock';
  const buildkitSocket = opts.buildkitSocket || null;
  const cacheDir = opts.cacheDir || '/var/lib/lando/buildkit';
  const gcMaxBytes = opts.gcMaxBytes || 10 * 1024 * 1024 * 1024; // 10GB default
  const parallelism = opts.parallelism || Math.max(1, os.cpus().length);
  const debug = opts.debug || false;
  const registryMirrors = opts.registryMirrors || {}; // { "docker.io": "https://mirror.example.com" }

  const lines = [
    '# Lando BuildKit configuration',
    '# Auto-generated — do not edit manually',
    '',
    debug ? 'debug = true' : undefined,
    debug ? '' : undefined,
    // gRPC listen address (buildkitd socket)
    buildkitSocket ? '[grpc]' : undefined,
    buildkitSocket ? `  address = ["unix://${buildkitSocket}"]` : undefined,
    buildkitSocket ? '' : undefined,
    '# Use containerd worker, disable OCI worker',
    '[worker.oci]',
    '  enabled = false',
    '',
    '[worker.containerd]',
    '  enabled = true',
    `  address = "${containerdSocket}"`,
    '  platforms = ["linux/amd64", "linux/arm64"]',
    `  max-parallelism = ${parallelism}`,
    '',
    '  # Garbage collection policy',
    '  [[worker.containerd.gcpolicy]]',
    `    reservedSpace = ${gcMaxBytes}`,
    '    keepDuration = 604800',
    '    all = true',
    '',
  ];

  // Add registry mirrors if configured
  for (const [registry, mirror] of Object.entries(registryMirrors)) {
    lines.push(`[registry."${registry}"]`);
    lines.push(`  mirrors = ["${mirror}"]`);
    lines.push('');
  }

  return lines.filter(l => l !== undefined).join('\n');
};
