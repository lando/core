'use strict';

module.exports = ({Labels, Id, Status}, separator = '_') => {
  // Get name of docker container.
  const app = Labels['com.docker.compose.project'];
  const service = Labels['com.docker.compose.service'];
  const num = Labels['com.docker.compose.container-number'];
  const lando = Labels['io.lando.container'];
  const special = Labels['io.lando.service-container'];
  // Build generic container.
  return {
    id: Id,
    service: service,
    name: [app, service, num].join(separator),
    app: (special !== 'TRUE') ? app : '_global_',
    src: (Labels['io.lando.src']) ? Labels['io.lando.src'].split(',') : 'unknown',
    kind: (special !== 'TRUE') ? 'app' : 'service',
    lando: (lando === 'TRUE') ? true : false,
    instance: Labels['io.lando.id'] || 'unknown',
    status: Status,
  };
};
