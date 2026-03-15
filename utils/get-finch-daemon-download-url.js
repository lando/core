'use strict';

/**
 * Return the GitHub release download URL for the finch-daemon binary.
 *
 * finch-daemon provides a Docker-compatible API socket backed by containerd,
 * allowing Traefik (and other Docker-API consumers) to work unchanged with
 * the containerd engine.
 *
 * Currently finch-daemon only publishes Linux/amd64 release assets on GitHub.
 * Darwin and arm64 are accepted for forward-compatibility but the caller
 * should be aware that those assets may not exist upstream yet.
 *
 * Release asset naming:
 *   `finch-daemon-{version}-{platform}-{arch}.tar.gz`
 *
 * Default version is intentionally conservative and matches the latest stable
 * release at the time of implementation.
 *
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.version]  - Semver version (no leading "v").
 * @param {string} [opts.platform] - 'linux' or 'darwin' (default: process.platform).
 * @param {string} [opts.arch]     - 'amd64' or 'arm64' (default: auto-detected).
 * @returns {string} The full download URL.
 * @throws {Error} If an unsupported platform or arch is given.
 */
module.exports = ({version, platform, arch} = {}) => {
  const v = version || '0.22.0';

  // Normalise platform
  platform = platform || process.platform;
  if (platform === 'win32') platform = 'windows';

  // Normalise arch from Node conventions to Go conventions
  arch = arch || (process.arch === 'x64' ? 'amd64' : process.arch);

  // Validate platform + arch
  const supported = ['linux-amd64', 'linux-arm64', 'darwin-amd64', 'darwin-arm64'];
  const key = `${platform}-${arch}`;
  if (!supported.includes(key)) {
    throw new Error(`Unsupported platform/arch combination: ${key}`);
  }

  // https://github.com/runfinch/finch-daemon/releases/download/v{V}/finch-daemon-{V}-{OS}-{ARCH}.tar.gz
  return `https://github.com/runfinch/finch-daemon/releases/download/v${v}/finch-daemon-${v}-${key}.tar.gz`;
};
