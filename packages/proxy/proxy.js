'use strict';

module.exports = (service, {id, project, volume}) => {
  service.addLandoRunData({
    environment: {
      LANDO_PROXY_CERT: `/lando/certs/${id}.${project}.crt`,
      LANDO_PROXY_KEY: `/lando/certs/${id}.${project}.key`,
      LANDO_PROXY_CONFIG_FILE: `/proxy_config/${id}.${project}.yaml`,
    },
    volumes: [
      `${volume}:/proxy_config`,
    ],
  });

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
