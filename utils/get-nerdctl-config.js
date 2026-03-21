'use strict';

module.exports = (opts = {}) => {
  const address = opts.containerdSocket || '/run/lando/containerd.sock';
  const namespace = opts.namespace || 'default';
  const cniNetconfPath = opts.cniNetconfPath || '/etc/cni/net.d/finch';
  const cniPath = opts.cniPath || '/usr/lib/cni';

  return [
    '# Lando containerd client configuration',
    '# Auto-generated - do not edit manually',
    `address = "${address}"`,
    `namespace = "${namespace}"`,
    `cni_netconfpath = "${cniNetconfPath}"`,
    `cni_path = "${cniPath}"`,
    '',
  ].join('\n');
};
