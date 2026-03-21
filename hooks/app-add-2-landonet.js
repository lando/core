'use strict';

const _ = require('lodash');


const isNotConnectedError = error => _.includes(error.message, 'is not connected to network')
  || _.includes(error.message, 'network or container is not found');

/**
 * Resolve the container's IP on the preferred Lando network.
 *
 * @param {Object} lando - Lando instance.
 * @param {Object} app - Lando app instance.
 * @param {Object} [data={}] - Container inspect data.
 * @returns {string|undefined} IP address if found.
 * @private
 */
const getContainerdNetworkIP = (lando, app, data = {}) => {
  const configuredNetworks = JSON.parse(_.get(data, 'Config.Labels.nerdctl/networks', '[]'));
  const networks = _.get(data, 'NetworkSettings.Networks', {});
  const preferred = [lando.config.networkBridge, `${app.project}_default`, lando.config.proxyNet];

  for (const name of preferred) {
    const index = configuredNetworks.indexOf(name);
    if (index === -1) continue;
    const ip = _.get(networks, `unknown-eth${index}.IPAddress`);
    if (ip) return ip;
  }
  return undefined;
};

/**
 * Retrieve the Dockerode instance from the Lando engine.
 *
 * Uses the existing Dockerode instance on the containerd container backend
 * (already pointed at finch-daemon) rather than creating a new one. This makes
 * the function testable and avoids duplicate socket connections.
 *
 * @param {Object} lando - Lando instance.
 * @returns {import('dockerode')} Dockerode instance.
 * @private
 */
const getDockerode = lando => {
  // Prefer the Dockerode instance already wired to finch-daemon
  if (_.get(lando, 'engine.docker.dockerode')) return lando.engine.docker.dockerode;
  // Fallback: create one (shouldn't normally happen)
  const Docker = require('dockerode');
  const finchSocket = lando.config.finchSocket || '/run/lando/finch.sock';
  return new Docker({socketPath: finchSocket});
};

/**
 * Update /etc/hosts inside a container using Dockerode exec via finch-daemon.
 *
 * Per BRIEF: "Never shell out to nerdctl from user-facing code." This uses
 * the Docker API exec endpoint through finch-daemon instead.
 *
 * @param {Object} lando - Lando instance.
 * @param {string} target - Container name.
 * @param {Array<{ip: string, alias: string}>} entries - Host entries to add.
 * @returns {Promise<void>}
 * @private
 */
const updateHosts = async (lando, target, entries) => {
  const dockerode = getDockerode(lando);
  const container = dockerode.getContainer(target);

  const echoLines = entries
    .map(({ip, alias}) => {
      // Allowlist sanitization: IPs may only contain digits, dots, colons; aliases only alphanum, dots, hyphens
      const safeIp = ip.replace(/[^0-9.:]/g, '');
      const safeAlias = alias.replace(/[^a-zA-Z0-9.\-_]/g, '');
      return `echo '${safeIp} ${safeAlias} # lando-internal-aliases' >> "$tmp"`;
    })
    .join(' && ');
  const script = [
    'tmp=$(mktemp)',
    "grep -v 'lando-internal-aliases' /etc/hosts > \"$tmp\" || true",
    echoLines,
    'cat "$tmp" > /etc/hosts',
    'rm -f "$tmp"',
  ].join(' && ');

  const exec = await container.exec({
    Cmd: ['sh', '-lc', script],
    User: 'root',
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({hijack: true, stdin: false});

  return new Promise((resolve, reject) => {
    let stderr = '';
    stream.on('data', () => {}); // drain stdout
    stream.on('error', reject);
    stream.on('end', async () => {
      try {
        const info = await exec.inspect();
        if (info.ExitCode !== 0) {
          reject(new Error(`updateHosts exec failed on ${target} (exit ${info.ExitCode}): ${stderr}`));
        } else {
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    });
  });
};

module.exports = async (app, lando) => {
  if (lando.engine?.engineBackend === 'containerd') {
    // Derive containers from app metadata (populated during init from compose files)
    // instead of finch-daemon listContainers which may not report running containers
    const aliases = [];
    const targets = [];

    for (const service of (app.services || [])) {
      const containerName = _.get(app, `containers.${service}`, `${app.project}-${service}-1`);
      try {
        const data = await lando.engine.scan({id: containerName});
        const ip = getContainerdNetworkIP(lando, app, data);
        const name = _.get(data, 'Name', containerName).replace(/^\//, '');
        targets.push(name);
        if (ip) {
          aliases.push({ip, alias: `${service}.${app.project}.internal`});
        }
      } catch (err) {
        app.log.debug('containerd landonet: could not scan %s: %s', containerName, err.message);
      }
    }

    app.log.debug('containerd landonet hook found containers %j', targets);
    app.log.debug('containerd landonet aliases %j', aliases);
    if (_.isEmpty(aliases)) return;

    if (lando.config.proxy === 'ON' && await lando.engine.exists({id: lando.config.proxyContainer})) {
      try {
        const proxyData = await lando.engine.scan({id: lando.config.proxyContainer});
        targets.push(_.get(proxyData, 'Name', lando.config.proxyContainer).replace(/^\//, ''));
      } catch (err) {
        app.log.debug('containerd landonet: could not scan proxy: %s', err.message);
      }
    }

    app.log.debug('containerd landonet targets %j', _.uniq(targets));
    return lando.Promise.each(_.uniq(targets), target => updateHosts(lando, target, aliases));
  }

  // We assume the lando net exists at this point
  const landonet = lando.engine.getNetwork(lando.config.networkBridge);
  // List all our app containers
  return lando.engine.list({project: app.project})
  // Go through each container
  .map(container => {
    // Define the internal aliae
    const internalAlias = `${container.service}.${container.app}.internal`;
    // Sometimes you need to disconnect before you reconnect
    return landonet.disconnect({Container: container.id, Force: true})
    // Only throw non not connected errors
    .catch(error => {
      if (!isNotConnectedError(error)) throw error;
    })
    // Connect
    .then(() => landonet.connect({Container: container.id, EndpointConfig: {Aliases: [internalAlias]}}))
    .then(() => {
      app.log.debug('connected %s to the landonet', container.name);
    });
  });
};
