'use strict';

module.exports = async (service, {volume}) => {
  // add this as a top level volume
  // @TODO: do we actually need this snce its just for rundata and we are typing our volume?
  service.tlvolumes[volume] = {external: true};

  // add run data
  service.addLandoRunData({
    environment: {
      LANDO_PROXY_CERT: `/lando/certs/${service.id}.${service.project}.crt`,
      LANDO_PROXY_KEY: `/lando/certs/${service.id}.${service.project}.key`,
      LANDO_PROXY_CONFIG_FILE: `/proxy_config/${service.id}.${service.project}.yaml`,
    },
    volumes: [{type: 'volume', source: volume, target: '/proxy_config'}],
  });

  // add hook file
  service.addHookFile(`
    # if we have certs then lets add the proxy config
    # we do this here instead of in the plugin code because it avoids a race condition
    # where the proxy config file exists before the certs
    if [ ! -z "\${LANDO_PROXY_CONFIG_FILE+x}" ] \
      && [ ! -z "\${LANDO_PROXY_CERT+x}" ] \
      && [ ! -z "\${LANDO_PROXY_KEY+x}" ]; then
      # remove older config if its there
      # we need to do this so traefik recognizes new certs and loads them
      rm -f "$LANDO_PROXY_CONFIG_FILE"

      # Dump the yaml
      tee "$LANDO_PROXY_CONFIG_FILE" > /dev/null <<EOF
    tls:
      certificates:
        - certFile: "$LANDO_PROXY_CERT"
          keyFile: "$LANDO_PROXY_KEY"
    EOF
    fi
  `, {stage: 'app', hook: 'internal-root', priority: '000', id: 'proxy-certs'});
};
