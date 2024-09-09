'use strict';

const _ = require('lodash');
const hasher = require('object-hash');
const merge = require('../utils/merge');
const path = require('path');
const parseUrl = require('../utils/parse-proxy-url');
const url = require('url');

/*
 * Helper to scanPorts
 */
const scanPorts = (lando, status = {http: true, https: true}) => {
  return lando.Promise.all([
    getFirstOpenPort(lando.scanUrls, lando.config.proxyScanHttp),
    getFirstOpenPort(lando.scanUrls, lando.config.proxyScanHttps),
  ])
  // @TODO: below could live in utils and would be easy to test
  .then(results => ({http: results[0], https: results[1]}))
  .then(ports => {
    if (!status.http) delete ports.http;
    if (!status.https) delete ports.https;
    return ports;
  });
};

/*
 * Helper to find the ports we need for the proxy
 */
const findProxyPorts = (lando, status) => lando.Promise.try(() => {
  if (_.some(_.values(status))) {
    return scanPorts(lando, status).then(ports => _.merge(lando.config.proxyCurrentPorts, ports));
  } else {
    return lando.engine.list()
    .filter(container => container.name === lando.config.proxyContainer)
    .then(containers => _.isEmpty(containers) ? scanPorts(lando) : lando.config.proxyLastPorts);
  }
});

const getFirstOpenPort = (scanner, urls = []) => scanner(urls, {max: 1, waitCodes: []})
  .filter(url => url.status === false)
  .map(port => _.last(port.url.split(':')))
  .then(ports => ports[0]);

/*
 * Helper to get all ports
 */
const getAllPorts = (noHttp = false, noHttps = false, config) => {
  const {proxyHttpPort, proxyHttpsPort, proxyHttpFallbacks, proxyHttpsFallbacks} = config;
  const ports = [];
  if (noHttp) {
    ports.push(proxyHttpPort);
    ports.push(proxyHttpFallbacks);
  }
  if (noHttps) {
    ports.push(proxyHttpsPort);
    ports.push(proxyHttpsFallbacks);
  }
  return _.flatten(ports).join(', ');
};

/*
 * Helper to get proxy runner
 */
const getProxyRunner = (project, files) => ({
  compose: files,
  project: project,
  opts: {
    services: ['proxy'],
    noRecreate: false,
  },
});

/*
 * Helper to get the trafix rule
 */
const getRule = rule => {
  // we do this so getRule is backwards campatible with the older rule.host
  const host = rule.hostname ?? rule.host;

  // Start with the rule we can assume
  const hostRegex = host.replace(new RegExp('\\*', 'g'), '{wildcard:[a-z0-9-]+}');
  const rules = [`HostRegexp(\`${hostRegex}\`)`];

  // Add in the path prefix if we can
  if (rule.pathname.length > 1) rules.push(`PathPrefix(\`${rule.pathname}\`)`);

  // return
  return rules.join(' && ');
};

/*
 * Get a list of URLs and their counts
 */
const getUrlsCounts = config => _(config)
  .flatMap(service => service)
  .map(url => parseUrl(url))
  .map(data => `${data.host}${data.pathname}`)
  .countBy()
  .value();

/*
 * Helper to determine what ports have changed
 */
const needsProtocolScan = (current, last, status = {http: true, https: true}) => {
  if (!last) return status;
  if (current.http === last.http) status.http = false;
  if (current.https === last.https) status.https = false;
  return status;
};

/*
 * Helper to parse a url
 */
const normalizeRoutes = (services = {}) => Object.fromEntries(_.map(services, (routes, key) => {
  const defaults = {port: '80', pathname: '/', middlewares: []};

  // normalize routes
  routes = routes.map(route => {
    // if route is a string then
    if (typeof route === 'string') route = {hostname: route};

    // url parse hostname with wildcard stuff if needed
    route.hostname = route.hostname.replace(/\*/g, '__wildcard__');

    // if hostname does not start with http:// or https:// then prepend http
    // @TODO: does this allow for protocol selection down the road?
    if (!route.hostname.startsWith('http://') || !route.hostname.startsWith('https://')) {
      route.hostname = `http://${route.hostname}`;
    }

    // at this point we should be able to parse the hostname
    // @TODO: do we need to try/catch this?
    // @NOTE: lets hold off on URL.parse until more people reliable have a node20 ready cli
    // const {hostname, port, pathname} = URL.parse(route.hostname);
    const {hostname, port, pathname} = url.parse(route.hostname);

    // and rebase the whole thing
    route = merge({}, [defaults, {port: _.isNil(port) ? '80' : port, pathname}, route, {hostname}], ['merge:key', 'replace']);

    // wildcard replacement back
    route.hostname = route.hostname.replace(/__wildcard__/g, '*');

    // generate an id based on protocol/hostname/path so we can groupby and dedupe
    route.id = hasher(`${route.hostname}-${route.pathname}`);

    // and return
    return route;
  });

  // merge together all routes with the same id
  routes = _(_.groupBy(routes, 'id')).map(routes => merge({}, routes, ['merge:key', 'replace'])).value();

  // return
  return [key, routes];
}));

/*
 * Parse urls into SANS
 */
const parse2Sans = urls => _(urls)
  .map(url => parseUrl(url).host)
  .map((host, index) => `DNS.${10+index} = ${host}`)
  .value()
  .join('\n');

/*
 * Parse hosts for traefik
 */
const parseConfig = (config, sslReady = []) => _(config)
  .map((urls, service) => ({
    environment: {
      LANDO_PROXY_NAMES: parse2Sans(urls),
    },
    name: service,
    labels: parseRoutes(service, urls, sslReady)}))
  .value();


/*
 * Helper to parse the routes
 */
const parseRoutes = (service, urls = [], sslReady, labels = {}) => {
  // Prepare our URLs for traefik
  const rules = _(urls).uniqBy('id').value();

  // Add things into the labels
  _.forEach(rules, rule => {
    // Add some default middleware
    rule.middlewares.push({name: 'lando', key: 'headers.customrequestheaders.X-Lando', value: 'on'});

    // Add in any path stripping middleware we need it
    if (rule.pathname.length > 1) {
      rule.middlewares.push({name: 'stripprefix', key: 'stripprefix.prefixes', value: rule.pathname});
    }

    // Ensure we prefix all middleware with the ruleid
    rule.middlewares = _(rule.middlewares)
      .map(middleware => _.merge({}, middleware, {name: `${rule.id}-${middleware.name}`}))
      .value();

    // Set up all the middlewares
    _.forEach(rule.middlewares, m => {
      labels[`traefik.http.middlewares.${m.name}.${m.key}`] = m.value;
    });

    // Set the http entrypoint
    labels[`traefik.http.routers.${rule.id}.entrypoints`] = 'http';
    labels[`traefik.http.routers.${rule.id}.service`] = `${rule.id}-service`;
    // Rules are grouped by port so the port for any rule should be fine
    labels[`traefik.http.services.${rule.id}-service.loadbalancer.server.port`] = rule.port;
    // Set the route rules
    labels[`traefik.http.routers.${rule.id}.rule`] = getRule(rule);
    // Set none secure middlewares
    labels[`traefik.http.routers.${rule.id}.middlewares`] = _(_.map(rule.middlewares, 'name'))
      .filter(name => !_.endsWith(name, '-secured'))
      .value()
      .join(',');

    // Add https if we can
    if (_.includes(sslReady, service)) {
      labels['io.lando.proxy.has-certs'] = true;
      labels['dev.lando.proxy.has-certs'] = true;
      labels[`traefik.http.routers.${rule.id}-secured.entrypoints`] = 'https';
      labels[`traefik.http.routers.${rule.id}-secured.service`] = `${rule.id}-secured-service`;
      labels[`traefik.http.routers.${rule.id}-secured.rule`] = getRule(rule);
      labels[`traefik.http.routers.${rule.id}-secured.tls`] = true;
      labels[`traefik.http.routers.${rule.id}-secured.middlewares`] = _.map(rule.middlewares, 'name').join(',');
      labels[`traefik.http.services.${rule.id}-secured-service.loadbalancer.server.port`] = rule.port;
    }

    // add the protocols label for testing purposes
    labels['io.lando.proxy.protocols'] = _.includes(sslReady, service) ? 'http,https' : 'http';
    labels['dev.lando.proxy.protocols'] = _.includes(sslReady, service) ? 'http,https' : 'http';
  });
  return labels;
};

module.exports = async (app, lando) => {
  // Only do things if the proxy is enabled
  if (lando.config.proxy === 'ON' && (!_.isEmpty(app.config.proxy) || !_.isEmpty(app.config.recipe))) {
    // generate proxy cert
    await lando.generateCert('proxy._lando_', {domains: [
      `*.${lando.config.proxyDomain}`,
      'proxy._lando_.internal',
    ]});

    // Determine what ports we need to discover
    const protocolStatus = needsProtocolScan(lando.config.proxyCurrentPorts, lando.config.proxyLastPorts);
    // And then discover!
    return findProxyPorts(lando, protocolStatus).then(ports => {
      // Fail immediately with a warning if we dont have the ports we need
      if (_.isEmpty(ports.http) || _.isEmpty(ports.https)) {
        const allPorts = getAllPorts(_.isEmpty(ports.http), _.isEmpty(ports.https), lando.config);
        return Promise.reject(`Lando could not detect an open port amongst: ${allPorts}`);
      }

      // Build the proxy
      const LandoProxy = lando.factory.get('_proxy');
      const proxyData = new LandoProxy(ports.http, ports.https, lando.config);
      const proxyFiles = lando.utils.dumpComposeData(proxyData, path.join(lando.config.userConfRoot, 'proxy'));

      // Start the proxy
      return lando.engine.start(getProxyRunner(lando.config.proxyName, proxyFiles)).then(() => {
        lando.cache.set(lando.config.proxyCache, ports, {persist: true});
        return ports;
      });
    })

    // Parse the proxy config to get traefix labels
    .then(() => {
      // normalize and merge proxy routes
      app.config.proxy = normalizeRoutes(app.config.proxy);

      // log error for any duplicates across services
      // @NOTE: this actually just calculates ALL occurences of a given hostname and not within each service
      // but with the deduping in normalizeRoutes it probably works well enough for right now
      const urlCounts = getUrlsCounts(app.config.proxy);
      if (_.max(_.values(urlCounts)) > 1) {
        app.log.error('You cannot assign url %s to more than one service!', _.findKey(urlCounts, c => c > 1));
      }

      // Get list of services that *should* have certs for SSL
      const sslReady = _(_.get(app, 'config.services', []))
        .map((data, name) => _.merge({}, data, {name}))
        .filter(data => data.ssl)
        .map(data => data.name)
        .value();

      // Make sure we augment ssl ready if we have served by candidates
      // and also add to their info eg hasCerts
      const servedBy = _(app.info)
        .filter(info => _.includes(sslReady, info.service))
        .filter(info => _.has(info, 'served_by') || _.has(info, 'ssl_served_by'))
        .map(info => info.served_by || info.ssl_served_by)
        .value();

      // Add hasCerts to servedBys
      _.forEach(servedBy, name => {
        const service = _.find(app.info, {service: name});
        if (service) service.hasCerts = true;
      });

      // get new v4 ssl ready services
      const sslReadyV4 = _(_.get(app, 'v4.services', []))
        .filter(data => data.certs)
        .map(data => data.id)
        .value();

      // Parse config
      return parseConfig(app.config.proxy, _.compact(_.flatten([sslReady, servedBy, sslReadyV4])));
    })

    // Map to docker compose things
    .map(service => {
      // Throw error but proceed if we don't have the service
      if (!_.includes(app.services, service.name)) {
        app.addMessage(require('../messages/unknown-service-warning')(service.name));
        return {};
      }

      // Build out the docker compose augment and return
      service.labels['traefik.enable'] = true;
      service.labels['traefik.docker.network'] = lando.config.proxyNet;
      service.environment.LANDO_PROXY_PASSTHRU = _.toString(lando.config.proxyPassThru);
      return {
        services: _.set({}, service.name, {
          networks: {'lando_proxyedge': {}},
          labels: service.labels,
          environment: service.environment,
          volumes: [
            `${lando.config.proxyConfigDir}:/proxy_config`,
            `${lando.config.userConfRoot}/scripts/proxy-certs.sh:/scripts/100-proxy-certs`,
          ],
        }),
        networks: {'lando_proxyedge': {name: lando.config.proxyNet, external: true}},
      };
    })

    // Add to our app
    // @NOTE: we can't add this in the normal way since this happens AFTER our app
    // has been initialized
    .then(result => {
      app.add(new app.ComposeService('proxy', {}, ...result));
      app.compose = lando.utils.dumpComposeData(app.composeData, app._dir);
      app.log.debug('app now has proxy compose files', app.compose);
    })

    // Warn the user if this fails
    .catch(error => {
      if (!error.message || error.message === '') error.message = 'UNKNOWN ERROR';
      app.addWarning(require('../messages/cannot-start-proxy-warning')(error.message), error);
    });
  }
};
