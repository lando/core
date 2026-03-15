'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execSync} = require('child_process');

const LIMA_VERSION = '1.0.6';
const VM_NAME = 'lando';

/**
 * Get the Lima download URL for the current platform.
 *
 * Format: lima-<version>-Darwin-<arch>.tar.gz
 * where arch is arm64 (Apple Silicon) or x86_64 (Intel).
 */
const getLimaDownloadUrl = (version = LIMA_VERSION) => {
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  return `https://github.com/lima-vm/lima/releases/download/v${version}/lima-${version}-Darwin-${arch}.tar.gz`;
};

/**
 * Check if limactl binary exists at common locations or in PATH.
 */
const findLimactl = (binDir) => {
  // check lando bin dir first
  const landoBin = path.join(binDir, 'limactl');
  if (fs.existsSync(landoBin)) return landoBin;

  // check common homebrew / system paths
  const commonPaths = ['/opt/homebrew/bin/limactl', '/usr/local/bin/limactl'];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  // check PATH
  try {
    const result = execSync('which limactl', {stdio: 'pipe', encoding: 'utf-8'}).trim();
    if (result) return result;
  } catch {
    // not found
  }

  return null;
};

/**
 * Check if the Lima VM exists and is running.
 */
const isVMRunning = (limactlBin) => {
  try {
    const output = execSync(`"${limactlBin}" list ${VM_NAME} --json`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();

    if (!output) return false;

    // limactl list --json outputs NDJSON (one JSON object per line)
    const lines = output.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const vm = JSON.parse(line);
        if (vm.name === VM_NAME && vm.status === 'Running') return true;
      } catch {
        // skip malformed lines
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Check if the Lima VM exists (regardless of status).
 */
const vmExists = (limactlBin) => {
  try {
    const output = execSync(`"${limactlBin}" list ${VM_NAME} --json`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();

    if (!output) return false;

    const lines = output.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const vm = JSON.parse(line);
        if (vm.name === VM_NAME) return true;
      } catch {
        // skip
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Wait for the VM to reach Running status.
 */
const waitForVM = async (limactlBin, {maxWait = 60000, interval = 2000, debug} = {}) => {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (isVMRunning(limactlBin)) return true;
    debug('waiting for Lima VM "%s" to start...', VM_NAME);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
};

/**
 * Download Lima tarball with progress reporting.
 */
const downloadLima = (url, {debug, dest, task}) => new Promise((resolve, reject) => {
  const download = require('../utils/download-x')(url, {debug, dest});
  download.on('done', result => {
    task.title = 'Downloaded Lima';
    resolve(result);
  });
  download.on('error', error => reject(error));
  download.on('progress', progress => {
    task.title = `Downloading Lima ${require('listr2').color.dim(`[${progress.percentage}%]`)}`;
  });
});

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);
  const {color} = require('listr2');
  const axios = require('../utils/get-axios')();

  // Only run for containerd or auto engine selection
  const engine = lando.config.engine || 'auto';
  if (engine === 'docker') return;

  const userConfRoot = lando.config.userConfRoot || path.join(os.homedir(), '.lando');
  const binDir = path.join(userConfRoot, 'bin');

  const limactlDest = path.join(binDir, 'limactl');
  const url = getLimaDownloadUrl(LIMA_VERSION);

  // =========================================================================
  // TASK 1: Install Lima
  // =========================================================================
  options.tasks.push({
    title: 'Installing Lima',
    id: 'setup-lima',
    description: '@lando/lima (container VM)',
    version: `Lima v${LIMA_VERSION}`,
    dependsOn: ['setup-nerdctl'],
    hasRun: async () => {
      return findLimactl(binDir) !== null;
    },
    canRun: async () => {
      // verify download URL is reachable
      await axios.head(url);
      return true;
    },
    task: async (ctx, task) => {
      // ensure bin dir exists
      fs.mkdirSync(binDir, {recursive: true});

      // download the tarball to a temp location
      const tmpDir = path.join(os.tmpdir(), `lando-lima-${Date.now()}`);
      fs.mkdirSync(tmpDir, {recursive: true});

      const tarball = path.join(tmpDir, `lima-${LIMA_VERSION}.tar.gz`);
      await downloadLima(url, {debug, dest: tarball, task});

      // extract limactl from the tarball
      task.title = `Extracting Lima ${color.dim('...')}`;
      execSync(`tar -xzf "${tarball}" -C "${tmpDir}" bin/limactl`, {stdio: 'pipe'});

      // move limactl to bin dir
      const extracted = path.join(tmpDir, 'bin', 'limactl');
      fs.copyFileSync(extracted, limactlDest);
      require('../utils/make-executable')(['limactl'], path.dirname(limactlDest));

      // cleanup
      fs.rmSync(tmpDir, {recursive: true, force: true});

      task.title = `Installed Lima to ${limactlDest}`;
    },
  });

  // =========================================================================
  // TASK 2: Create and start Lima VM
  // =========================================================================
  options.tasks.push({
    title: 'Creating Lando container VM',
    id: 'setup-lima-vm',
    description: '@lando/lima-vm (containerd VM)',
    version: `Lima VM ${VM_NAME}`,
    dependsOn: ['setup-lima'],
    hasRun: async () => {
      const bin = findLimactl(binDir);
      if (!bin) return false;
      return isVMRunning(bin);
    },
    canRun: async () => {
      const bin = findLimactl(binDir);
      if (!bin) throw new Error('limactl not found — Lima must be installed first');
      return true;
    },
    task: async (ctx, task) => {
      const bin = findLimactl(binDir) || limactlDest;

      // check if VM already exists
      const exists = vmExists(bin);

      if (!exists) {
        // create the VM
        task.title = `Creating Lima VM "${VM_NAME}" ${color.dim('(this may take a minute)')}`;
        debug('creating Lima VM "%s"', VM_NAME);

        const runCommand = require('../utils/run-command');
        await runCommand(bin, [
          'create',
          `--name=${VM_NAME}`,
          '--containerd=system',
          '--cpus=4',
          '--memory=4',
          '--disk=60',
          '--plain',
          'template:default',
        ], {debug});
      }

      // start the VM if not already running
      if (!isVMRunning(bin)) {
        task.title = `Starting Lima VM "${VM_NAME}" ${color.dim('(this may take a minute)')}`;
        debug('starting Lima VM "%s"', VM_NAME);

        const runCommand = require('../utils/run-command');
        await runCommand(bin, ['start', VM_NAME], {debug});
      }

      // wait for VM to be running
      task.title = `Waiting for Lima VM "${VM_NAME}" to start ${color.dim('...')}`;
      const running = await waitForVM(bin, {debug});

      if (!running) {
        throw new Error(`Lima VM "${VM_NAME}" did not reach Running status within 60 seconds`);
      }

      task.title = `Lima VM "${VM_NAME}" is running`;
    },
  });
};
