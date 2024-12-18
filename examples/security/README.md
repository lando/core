# Security Example

This example exists primarily to test the following documentation:

* [Security](https://docs.lando.dev/core/v3/security.html)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should have the correct default cert issuer
lando certinfo | grep Issuer | grep "Lando Development CA"
lando certinfo --service arch | grep Issuer | grep "Lando Development CA"
lando certinfo --service fedora | grep Issuer | grep "Lando Development CA"
lando certinfo --service web2 | grep Issuer | grep "Lando Development CA"
lando certinfo --service web3 | grep Issuer | grep "Lando Development CA"

# Should set the environment variables correctly
lando exec arch -- env | grep LANDO_CA_DIR | grep /etc/ca-certificates/trust-source/anchors
lando exec arch -- env | grep LANDO_CA_BUNDLE | grep /etc/ssl/certs/ca-certificates.crt
lando exec fedora -- env | grep LANDO_CA_DIR | grep /etc/pki/ca-trust/source/anchors
lando exec fedora -- env | grep LANDO_CA_BUNDLE | grep /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
lando exec web -- env | grep LANDO_CA_DIR | grep /etc/ssl/certs/
lando exec web -- env | grep LANDO_CA_BUNDLE | grep /etc/ssl/certs/ca-certificates.crt

# Should have installed the CAs
lando exec arch -- "cat \$LANDO_CA_BUNDLE" | grep "Lando Development CA"
lando exec fedora -- "ls -lsa \$LANDO_CA_DIR" | grep LandoCA.crt
lando exec fedora -- "cat \$LANDO_CA_BUNDLE" | grep "Lando Development CA"
lando exec fedora -- "cat \$LANDO_CA_BUNDLE" | grep "Solo Development CA"
lando exec web -- "cat \$LANDO_CA_BUNDLE"
lando exec web -- "ls -lsa \$LANDO_CA_DIR" | grep LandoCA.pem
lando exec web2 -- "cat \$LANDO_CA_BUNDLE"
lando exec web2 -- "ls -lsa \$LANDO_CA_DIR" | grep LandoCA.pem
lando exec web2 -- "ls -lsa \$LANDO_CA_DIR" | grep SoloCA.pem
lando exec web3 -- "cat \$LANDO_CA_BUNDLE"
lando exec web3 -- "ls -lsa \$LANDO_CA_DIR" | grep LandoCA.pem
lando exec web3 -- "ls -lsa \$LANDO_CA_DIR" | grep LandoCA-

# Should use additional CAs if specified
lando exec web -- "ls -lsa \$LANDO_CA_DIR" | grep SoloCA.crt
lando exec web2 -- "ls -lsa \$LANDO_CA_DIR" | grep SoloCA.crt
lando exec web3 -- "ls -lsa \$LANDO_CA_DIR" | grep LandoCA-
lando exec fedora -- "ls -lsa \$LANDO_CA_DIR" | grep SoloCA.crt

# Should trust CA signed web traffic on host and in container
curl https://web.lndo.site
curl https://web2.lndo.site
curl https://web3.lndo.site
lando exec web -- curl https://localhost:8443
lando exec web2 -- curl https://localhost:8443
lando exec web3 -- curl https://localhost:8443

# Should have the correct cert issuer if LANDO_CA_CERT and LANDO_CA_KEY are set differently
LANDO_CA_CERT="$(pwd)/SoloCA.crt" LANDO_CA_KEY="$(pwd)/SoloCA.key" lando config --path caCert | grep "SoloCA.crt"
LANDO_CA_CERT="$(pwd)/SoloCA.crt" LANDO_CA_KEY="$(pwd)/SoloCA.key" lando config --path caKey | grep "SoloCA.key"
LANDO_CA_CERT="$(pwd)/SoloCA.crt" LANDO_CA_KEY="$(pwd)/SoloCA.key" lando rebuild -y
lando certinfo | grep Issuer | grep "Solo Development CA"
curl https://web.lndo.site
lando exec web -- curl https://localhost:8443
```

## Destroy tests

```bash
# Should destroy and poweroff
lando destroy -y
lando poweroff
```
