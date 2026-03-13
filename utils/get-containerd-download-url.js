'use strict';

/**
 * Return the GitHub release download URL for containerd-stack binaries.
 *
 * Supports three binaries — `containerd`, `nerdctl`, and `buildkit` (buildkitd)
 * — across linux/{amd64,arm64} and darwin/{amd64,arm64}.
 *
 * Each release tarball extracts into a `bin/` directory containing the
 * executable(s).  The caller is responsible for extracting and placing
 * the binary.
 *
 * Default versions are intentionally conservative and match the 2.0.x / 0.18.x
 * series referenced in the containerd-engine design.
 *
 * @param {string} binary   - One of 'containerd', 'nerdctl', or 'buildkit'.
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.version]  - Semver version (no leading "v").
 * @param {string} [opts.platform] - 'linux' or 'darwin' (default: process.platform).
 * @param {string} [opts.arch]     - 'amd64' or 'arm64' (default: auto-detected).
 * @returns {string} The full download URL.
 * @throws {Error} If an unsupported binary, platform, or arch is given.
 */
module.exports = (binary, {version, platform, arch} = {}) => {
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

  switch (binary) {
    // containerd releases:
    //   https://github.com/containerd/containerd/releases/download/v{V}/containerd-{V}-{OS}-{ARCH}.tar.gz
    //   tarball contains: bin/containerd, bin/containerd-shim*, bin/ctr
    case 'containerd': {
      const v = version || '2.0.4';
      // Note: containerd does not ship darwin binaries on GitHub — macOS users
      // would use Lima or Homebrew.  We still return the URL for consistency;
      // the download step will surface the 404 in a human-friendly way.
      return `https://github.com/containerd/containerd/releases/download/v${v}/containerd-${v}-${platform}-${arch}.tar.gz`;
    }

    // nerdctl releases:
    //   https://github.com/containerd/nerdctl/releases/download/v{V}/nerdctl-{V}-{OS}-{ARCH}.tar.gz
    //   tarball contains: nerdctl
    case 'nerdctl': {
      const v = version || '2.0.5';
      return `https://github.com/containerd/nerdctl/releases/download/v${v}/nerdctl-${v}-${platform}-${arch}.tar.gz`;
    }

    // buildkit releases:
    //   https://github.com/moby/buildkit/releases/download/v{V}/buildkit-v{V}.{OS}-{ARCH}.tar.gz
    //   Note: uses a dot (.) between version and OS, not a dash (-)
    //   tarball contains: bin/buildkitd, bin/buildctl
    case 'buildkit': {
      const v = version || '0.18.2';
      return `https://github.com/moby/buildkit/releases/download/v${v}/buildkit-v${v}.${platform}-${arch}.tar.gz`;
    }

    default:
      throw new Error(`Unknown binary "${binary}". Expected one of: containerd, nerdctl, buildkit`);
  }
};
