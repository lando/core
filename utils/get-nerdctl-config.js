'use strict';

const path = require('path');

module.exports = (opts = {}) => {
  const address = opts.containerdSocket || '/run/lando/containerd.sock';
  const namespace = opts.namespace || 'default';
  const cniNetconfPath = opts.cniNetconfPath || '/etc/lando/cni/finch';
  const finchCniRoot = opts.finchCniRoot
    || (path.basename(cniNetconfPath) === 'finch' ? path.dirname(cniNetconfPath) : cniNetconfPath);
  const cniPath = opts.cniPath || '/usr/local/lib/lando/cni/bin';

  return [
    '# Lando containerd client configuration',
    '# Auto-generated - do not edit manually',
    `address = "${address}"`,
    `namespace = "${namespace}"`,
    `cni_netconfpath = "${finchCniRoot}"`,
    `cni_path = "${cniPath}"`,
    '',
  ].join('\n');
};
