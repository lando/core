'use strict';

const os = require('os');
const path = require('path');

/**
 * Resolve a host mount path for the containerd backend and determine accessibility.
 *
 * On Linux and WSL2, bind mounts work natively so paths are passed through as-is.
 * On macOS (Lima), only paths within Lima mount points (default: home directory)
 * are accessible inside the VM. Paths outside the mounts are flagged as inaccessible
 * with a warning message explaining how to add the path to the Lima VM config.
 *
 * @param {string} hostPath - The host-side path to resolve.
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.platform] - Override platform (default: process.platform).
 * @param {string} [opts.homedir] - Override home directory (default: os.homedir()).
 * @param {Array}  [opts.limaMounts] - Lima mount definitions. Each entry should have
 *   `{location: string, writable?: boolean}`. Defaults to `[{location: homedir, writable: true}]`.
 * @returns {{resolvedPath: string, accessible: boolean, warning: string|null}}
 *
 * @since 4.0.0
 * @example
 * const {resolveContainerdMount} = require('../utils/resolve-containerd-mount');
 *
 * const result = resolveContainerdMount('/tmp/myproject', {platform: 'darwin'});
 * // => {resolvedPath: '/tmp/myproject', accessible: false, warning: '...'}
 *
 * const result2 = resolveContainerdMount('~/code/app', {platform: 'darwin'});
 * // => {resolvedPath: '/Users/me/code/app', accessible: true, warning: null}
 */
const resolveContainerdMount = (hostPath, opts = {}) => {
  const platform = opts.platform || process.platform;
  const homedir = opts.homedir || os.homedir();
  const limaMounts = opts.limaMounts || [{location: homedir, writable: true}];

  // Resolve the path: expand ~ and make relative paths absolute
  let resolvedPath = hostPath;
  if (!resolvedPath || typeof resolvedPath !== 'string') {
    return {resolvedPath: '', accessible: false, warning: 'Mount path is empty or invalid'};
  }

  // Expand tilde
  if (resolvedPath.startsWith('~')) {
    resolvedPath = path.join(homedir, resolvedPath.slice(1));
  }

  // Resolve to absolute
  resolvedPath = path.resolve(resolvedPath);

  // Linux: bind mounts work natively, always accessible
  if (platform === 'linux') {
    return {resolvedPath, accessible: true, warning: null};
  }

  // WSL2 (detected via win32 platform or explicit): /mnt/c/ paths work fine
  if (platform === 'win32') {
    return {resolvedPath, accessible: true, warning: null};
  }

  // macOS / Darwin: check if path is within a Lima mount point
  if (platform === 'darwin') {
    const isWithinMount = limaMounts.some(mount => {
      const mountLocation = path.resolve(mount.location);
      // path must be the mount location itself or a subdirectory of it
      return resolvedPath === mountLocation || resolvedPath.startsWith(mountLocation + path.sep);
    });

    if (isWithinMount) {
      return {resolvedPath, accessible: true, warning: null};
    }

    return {
      resolvedPath,
      accessible: false,
      warning: `Path "${resolvedPath}" is not shared with the Lima VM. `
        + 'Lima only mounts your home directory by default. '
        + 'To mount paths outside your home directory, add them to your Lima VM config '
        + '(~/.lima/lando/lima.yaml) under the "mounts" section and restart the VM. '
        + 'See https://lima-vm.io/docs/config/mount/ for details.',
    };
  }

  // Unknown platform: passthrough
  return {resolvedPath, accessible: true, warning: null};
};

/**
 * Quick boolean check for whether a host path is accessible to containerd.
 *
 * @param {string} hostPath - The host-side path to check.
 * @param {Object} [opts={}] - Same options as `resolveContainerdMount`.
 * @returns {boolean} True if the path is accessible, false otherwise.
 *
 * @since 4.0.0
 * @example
 * const {isPathAccessible} = require('../utils/resolve-containerd-mount');
 * if (!isPathAccessible('/tmp/outside', {platform: 'darwin'})) {
 *   console.warn('Path is not accessible in the Lima VM');
 * }
 */
const isPathAccessible = (hostPath, opts = {}) => {
  return resolveContainerdMount(hostPath, opts).accessible;
};

module.exports = {resolveContainerdMount, isPathAccessible};
