'use strict';

const path = require('path');

module.exports = async service => {
  service.addHookFile(path.join(__dirname, 'install-sudo.sh'), {hook: 'boot'});
  service.addSteps({group: 'setup-user-1-after', instructions: `
    RUN touch /etc/sudoers
    RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
    RUN getent group sudo > /dev/null || groupadd sudo
    RUN usermod -aG sudo ${service.user.name}
  `});
};
