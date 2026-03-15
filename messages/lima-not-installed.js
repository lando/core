'use strict';

module.exports = () => ({
  title: 'Lima is required for containerd on macOS',
  type: 'error',
  detail: [
    'Lima is required to run containerd on macOS.',
    'The containerd engine runs inside a Lima virtual machine on macOS',
    'because containerd requires a Linux kernel.',
    'Run "lando setup" to install Lima and create the Lando VM.',
  ],
  url: 'https://lima-vm.io',
});
