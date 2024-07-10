'use strict';

const path = require('path');

module.exports = async (service, user) => {
  service.addLSF(path.join(__dirname, 'add-user.sh'));
  service.addHookFile(path.join(__dirname, 'install-useradd.sh'), {hook: 'boot', priority: 10});
  service.addSteps({group: 'setup-user', instructions: `
    RUN /etc/lando/add-user.sh ${require('../../utils/parse-v4-pkginstall-opts')(user)}`,
  });
  service.addLandoServiceData({
    environment: {
      LANDO_USER: user.name,
      LANDO_GID: user.gid,
      LANDO_UID: user.uid,
    },
  });
};
