'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = (lando, options = {}) => {
  const requested = options.engine || lando.config.engine || 'auto';
  if (requested === 'docker' || requested === 'containerd') return requested;

  const cached = lando.cache.get('engine-selection');
  if (cached === 'docker' || cached === 'containerd') return cached;

  const dockerBin = lando.config.dockerBin || require('./get-docker-x')();
  if (dockerBin && fs.existsSync(dockerBin)) return 'docker';

  const userConfRoot = lando.config.userConfRoot || path.join(os.homedir(), '.lando');
  const systemBinDir = lando.config.containerdSystemBinDir || '/usr/local/lib/lando/bin';
  const containerdBin = lando.config.containerdBin || path.join(systemBinDir, 'containerd');
  const nerdctlBin = lando.config.nerdctlBin || path.join(userConfRoot, 'bin', 'nerdctl');
  if (fs.existsSync(containerdBin) || fs.existsSync(nerdctlBin)) return 'containerd';

  return 'docker';
};
