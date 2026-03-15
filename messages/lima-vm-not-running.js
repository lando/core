'use strict';

module.exports = () => ({
  title: 'Lando Lima VM is not running',
  type: 'warning',
  detail: [
    'The Lando Lima VM is stopped or not yet created.',
    'Lando will attempt to start it automatically.',
    'If this persists, try: limactl start lando',
    'Or run "lando setup" to recreate the VM.',
  ],
  url: 'https://lima-vm.io',
});
