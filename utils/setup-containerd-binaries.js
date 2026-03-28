'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {nanoid} = require('nanoid');

/**
 * Setup task helper that ensures containerd, nerdctl, and buildkitd binaries
 * are present at ~/.lando/bin/.
 *
 * For each binary:
 * 1. Check if it already exists at the target location.
 * 2. If missing, download the release tarball via download-x.js.
 * 3. Extract the binary from the tarball.
 * 4. Make it executable (chmod +x).
 *
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.userConfRoot]       - Lando config root (default ~/.lando).
 * @param {string} [opts.containerdVersion]  - containerd version to download.
 * @param {string} [opts.nerdctlVersion]     - nerdctl version to download.
 * @param {string} [opts.buildkitVersion]    - buildkit version to download.
 * @param {Function} [opts.debug]            - Debug logger function.
 * @returns {Promise<Object>} An object describing what was installed:
 *   { containerd: {installed, path, version}, nerdctl: {...}, buildkitd: {...} }
 */
module.exports = async (opts = {}) => {
  const debug = opts.debug || require('debug')('@lando/setup-containerd-binaries');
  const userConfRoot = opts.userConfRoot || path.join(os.homedir(), '.lando');
  const binDir = path.join(userConfRoot, 'bin');

  // Ensure bin directory exists
  fs.mkdirSync(binDir, {recursive: true});

  const getContainerdDownloadUrl = require('./get-containerd-download-url');
  const downloadX = require('./download-x');
  const makeExecutable = require('./make-executable');

  const results = {
    containerd: {installed: false, path: false, version: false, skipped: false},
    nerdctl: {installed: false, path: false, version: false, skipped: false},
    buildkitd: {installed: false, path: false, version: false, skipped: false},
  };

  // Binary definitions:
  // Each entry maps a binary name to its tarball key, the path inside the
  // tarball where the binary lives, and the download URL builder args.
  const binaries = [
    {
      name: 'containerd',
      key: 'containerd',
      // containerd tarball extracts to: bin/containerd
      innerPath: path.join('bin', 'containerd'),
      version: opts.containerdVersion,
    },
    {
      name: 'nerdctl',
      key: 'nerdctl',
      // nerdctl tarball extracts to: nerdctl (top-level)
      innerPath: 'nerdctl',
      version: opts.nerdctlVersion,
    },
    {
      name: 'buildkitd',
      key: 'buildkit',
      // buildkit tarball extracts to: bin/buildkitd
      innerPath: path.join('bin', 'buildkitd'),
      version: opts.buildkitVersion,
    },
  ];

  for (const bin of binaries) {
    const destPath = path.join(binDir, bin.name);

    // Skip if binary already exists
    if (fs.existsSync(destPath) && !fs.statSync(destPath).isDirectory()) {
      debug('%s already exists at %s, skipping', bin.name, destPath);
      results[bin.name].skipped = true;
      results[bin.name].path = destPath;
      continue;
    }

    // Build the download URL
    const urlOpts = {};
    if (bin.version) urlOpts.version = bin.version;

    let url;
    try {
      url = getContainerdDownloadUrl(bin.key, urlOpts);
    } catch (error) {
      debug('could not determine download URL for %s: %s', bin.name, error.message);
      continue;
    }

    debug('downloading %s from %s', bin.name, url);

    // Download the tarball to a temp location
    const tmpDest = path.join(os.tmpdir(), `lando-${bin.name}-${nanoid()}.tar.gz`);

    try {
      await downloadX(url, {dest: tmpDest, debug});
    } catch (error) {
      debug('failed to download %s: %s', bin.name, error.message);
      continue;
    }

    // Extract the specific binary from the tarball
    try {
      await _extractBinaryFromTarball(tmpDest, bin.innerPath, destPath, debug);
      makeExecutable([bin.name], binDir);

      results[bin.name].installed = true;
      results[bin.name].path = destPath;
      results[bin.name].version = bin.version || 'default';
      debug('installed %s to %s', bin.name, destPath);
    } catch (error) {
      debug('failed to extract %s from tarball: %s', bin.name, error.message);
    }

    // Clean up temp tarball
    try {
      if (fs.existsSync(tmpDest)) fs.unlinkSync(tmpDest);
    } catch {
      // best-effort cleanup
    }
  }

  return results;
};

/**
 * Extract a single file from a tar.gz archive to a destination path.
 *
 * Uses the system `tar` command, which is available on Linux, macOS, and WSL.
 *
 * @param {string} tarball   - Path to the .tar.gz file.
 * @param {string} innerPath - Relative path of the file inside the tarball.
 * @param {string} dest      - Destination path on disk.
 * @param {Function} debug   - Debug logger.
 * @returns {Promise<void>}
 * @private
 */
function _extractBinaryFromTarball(tarball, innerPath, dest, debug) {
  return new Promise((resolve, reject) => {
    const {execFile} = require('child_process');
    const tmpDir = path.join(os.tmpdir(), `lando-extract-${nanoid()}`);

    fs.mkdirSync(tmpDir, {recursive: true});

    // Extract just the file we need
    execFile('tar', [
      'xzf', tarball,
      '-C', tmpDir,
      '--strip-components', String(innerPath.split(path.sep).length - 1 || 0),
      innerPath,
    ], (error) => {
      // If --strip-components extraction didn't work, try without stripping
      // and look for the file manually
      const binaryName = path.basename(innerPath);
      const extractedPath = path.join(tmpDir, binaryName);

      if (error || !fs.existsSync(extractedPath)) {
        // Fallback: extract everything and find the binary
        debug('targeted extraction failed for %s, trying full extraction', innerPath);
        execFile('tar', ['xzf', tarball, '-C', tmpDir], (err2) => {
          if (err2) {
            _cleanupDir(tmpDir);
            return reject(err2);
          }

          // Search for the binary in the extracted directory
          const found = _findFile(tmpDir, binaryName);
          if (!found) {
            _cleanupDir(tmpDir);
            return reject(new Error(`Could not find ${binaryName} in tarball`));
          }

          // Copy to destination
          fs.mkdirSync(path.dirname(dest), {recursive: true});
          fs.copyFileSync(found, dest);
          _cleanupDir(tmpDir);
          resolve();
        });
        return;
      }

      // Copy to destination
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      fs.copyFileSync(extractedPath, dest);
      _cleanupDir(tmpDir);
      resolve();
    });
  });
}

/**
 * Recursively find a file by name in a directory.
 *
 * @param {string} dir  - Directory to search.
 * @param {string} name - File name to find.
 * @returns {string|null} Full path to the file, or null.
 * @private
 */
function _findFile(dir, name) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = _findFile(fullPath, name);
      if (found) return found;
    } else if (entry.name === name) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Remove a directory tree (best-effort).
 *
 * @param {string} dir - Directory to remove.
 * @private
 */
function _cleanupDir(dir) {
  try {
    fs.rmSync(dir, {recursive: true, force: true});
  } catch {
    // best-effort
  }
}
