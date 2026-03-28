'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // Only check on macOS with containerd engine
  if (_.get(lando, 'config.os.landoPlatform', process.platform) !== 'darwin') return;

  const backend = _.get(lando, 'engine.engineBackend', _.get(lando, 'config.engine', 'auto'));
  if (backend !== 'containerd') return;

  const {resolveContainerdMount} = require('../utils/resolve-containerd-mount');

  // Collect all host-side volume mount paths from compose data
  const inaccessible = [];

  _.forEach(app.composeData, service => {
    _.forEach(service.data, datum => {
      _.forEach(_.get(datum, 'services', {}), (props, serviceName) => {
        _.forEach(props.volumes, volume => {
          let hostPath;

          // Volumes can be strings ("./src:/app") or objects ({type: "bind", source: "...", target: "..."})
          if (_.isString(volume)) {
            const parts = volume.split(':');
            hostPath = parts[0];
          } else if (_.get(volume, 'type') === 'bind' && _.get(volume, 'source')) {
            hostPath = volume.source;
          }

          if (hostPath) {
            const result = resolveContainerdMount(hostPath, {platform: 'darwin'});
            if (!result.accessible) {
              inaccessible.push({serviceName, hostPath, warning: result.warning});
            }
          }
        });
      });
    });
  });

  if (!_.isEmpty(inaccessible)) {
    const paths = inaccessible.map(m => `  - ${m.serviceName}: ${m.hostPath}`).join('\n');
    app.log.warn(
      'Some volume mounts are not accessible in the Lima VM:\n%s\n%s',
      paths,
      inaccessible[0].warning,
    );
  }
};
