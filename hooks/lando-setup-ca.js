'use strict';

const _ = require('lodash');
const fs = require('fs');

/*
 * Helper to get ca run object
 */
const getCaRunner = (project, files, separator = '_') => ({
  id: [project, 'ca', '1'].join(separator),
  compose: files,
  project: project,
  cmd: '/setup-ca.sh',
  opts: {
    mode: 'attach',
    services: ['ca'],
    autoRemove: true,
  },
});

module.exports = async (lando, data, {caCert, caDir, caProject}) => {
  if (!fs.existsSync(caCert) && data.project !== caProject) {
    const LandoCa = lando.factory.get('_casetup');
    const env = _.cloneDeep(lando.config.appEnv);
    const labels = _.cloneDeep(lando.config.appLabels);
    const caData = new LandoCa(lando.config.userConfRoot, env, labels);
    const caFiles = lando.utils.dumpComposeData(caData, caDir);
    lando.log.debug('setting up Lando Local CA at %s', caCert);
    return lando.engine.run(getCaRunner(caProject, caFiles, lando.config.orchestratorSeparator));
  }
};
