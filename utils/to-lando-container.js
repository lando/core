'use strict';

const path = require('path');

module.exports = ({Labels, Id, Status}, separator = '_', src = []) => {
  // Get name of docker container.
  const app = Labels['com.docker.compose.project'];
  const service = Labels['com.docker.compose.service'];
  const num = Labels['com.docker.compose.container-number'];
  const lando = Labels['io.lando.container'];
  const special = Labels['io.lando.service-container'];

  // if we have io.lando.root and io.lando.
  if (Labels['io.lando.root'] && Labels['io.lando.landofiles']) {
    src = Labels['io.lando.landofiles'].split(',').map(landofile => path.join(Labels['io.lando.root'], landofile));

  // or legacy support for Labels['io.lando.src']
  } else if (Labels['io.lando.src']) {
    src = Labels['io.lando.src'].split(',');

  // or its just unknown
  } else src = 'unknown';

  // Build generic container.
  return {
    id: Id,
    service: service,
    name: [app, service, num].join(separator),
    app: (special !== 'TRUE') ? app : '_global_',
    kind: (special !== 'TRUE') ? 'app' : 'service',
    lando: (lando === 'TRUE') ? true : false,
    instance: Labels['io.lando.id'] || 'unknown',
    status: Status,
    src,
  };
};
