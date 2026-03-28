'use strict';

const getContainerdPaths = require('../../../utils/get-containerd-paths');
const ensureCniNetwork = require('../../../utils/ensure-cni-network');

/**
 * Containerd proxy adapter for Traefik integration.
 *
 * Traefik's Docker provider discovers containers by watching the Docker socket
 * for events and reading container labels. When Lando uses the containerd
 * backend, finch-daemon provides Docker API v1.43 compatibility on a Unix
 * socket at `/run/lando/finch.sock`.
 *
 * This adapter handles the CNI network bridging concern for proxy operation:
 * docker-compose via finch-daemon creates networks at the Docker API level but
 * not at the CNI level. The nerdctl OCI hook needs CNI configs for container
 * networking. This adapter pre-creates CNI conflist files for proxy networks
 * (e.g. `_edge`).
 *
 * Socket mapping is handled elsewhere:
 * - `hooks/lando-set-proxy-config.js` sets `lando.config.dockerSocket` to finch socket
 * - `builders/_proxy.js` mounts it as `/var/run/docker.sock` inside the Traefik container
 *
 * @since 4.0.0
 */
class ContainerdProxyAdapter {
  /**
   * Create a ContainerdProxyAdapter.
   *
   * @param {Object} [opts={}] - Configuration options.
   * @param {Object} [opts.config={}] - Lando config object.
   * @param {string} [opts.finchSocket] - Path to finch-daemon socket. Defaults to /run/lando/finch.sock.
   * @param {Function} [opts.debug] - Debug/logging function.
   */
  constructor(opts = {}) {
    const config = opts.config || {};
    const paths = getContainerdPaths(config);

    /** @type {string} */
    this.finchSocket = opts.finchSocket || paths.finchSocket;

    /** @type {Function} */
    this.debug = opts.debug || (() => {});
  }

  /**
   * Ensure CNI network configs exist for all proxy-related networks.
   *
   * The proxy uses an `_edge` network (e.g. `landoproxyhyperion5000gandalfedition_edge`).
   * docker-compose via finch-daemon creates this at the Docker API level, but the
   * nerdctl OCI hook needs a CNI conflist file for container networking to work.
   *
   * This must be called BEFORE `lando.engine.start()` for the proxy, so the
   * CNI config exists when containers are created.
   *
   * @param {string} proxyName - The proxy project name (e.g. 'landoproxyhyperion5000gandalfedition').
   * @param {Object} [opts={}] - Options passed through to ensureCniNetwork.
   * @param {string} [opts.cniNetconfPath] - CNI config directory override.
   * @return {Object} Results keyed by network name, values are booleans (true = created).
   */
  ensureProxyNetworks(proxyName, opts = {}) {
    const debugFn = opts.debug || this.debug;
    const results = {};

    // The proxy compose defines `networks: { edge: { driver: 'bridge' } }`,
    // which docker-compose names as `${proxyName}_edge`.
    const edgeNetwork = `${proxyName}_edge`;
    results[edgeNetwork] = ensureCniNetwork(edgeNetwork, {...opts, debug: debugFn});

    // Also ensure the default network exists (compose may create one)
    const defaultNetwork = `${proxyName}_default`;
    results[defaultNetwork] = ensureCniNetwork(defaultNetwork, {...opts, debug: debugFn});

    if (results[edgeNetwork]) {
      debugFn('created CNI config for proxy edge network: %s', edgeNetwork);
    }

    return results;
  }

  /**
   * Ensure the CNI config exists for an app's proxy edge network reference.
   *
   * When an app service is added to the proxy network via
   * `networks: { lando_proxyedge: { name: proxyNet, external: true } }`,
   * the CNI config for that external network must already exist.
   *
   * This is typically the same network as the proxy's edge network, but
   * calling this is a safety net to ensure it exists before app compose up.
   *
   * @param {string} proxyNet - The proxy network name (e.g. 'landoproxyhyperion5000gandalfedition_edge').
   * @param {Object} [opts={}] - Options passed through to ensureCniNetwork.
   * @return {boolean} true if a conflist was created, false if it already existed.
   */
  ensureAppProxyNetwork(proxyNet, opts = {}) {
    return ensureCniNetwork(proxyNet, {...opts, debug: opts.debug || this.debug});
  }
}

module.exports = ContainerdProxyAdapter;
