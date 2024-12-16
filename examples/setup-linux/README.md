# Setup Linux Tests

This example exists primarily to test the following documentation:

* [lando setup](https://docs.lando.dev/cli/setup.html)

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should dogfood the core plugin we are testing against
lando plugin-add "@lando/core@file:../.."

# Should be able to uninstall docker engine succesfully
sudo apt-get remove docker-ce docker-ce-cli containerd.io
sudo apt-get autoremove -y
dpkg -l | grep docker-desktop || echo $? | grep 1

# Should be able to run lando setup
lando setup -y --skip-common-plugins

# Should have installed Docker Engine
docker version
docker info

# Should have installed Docker Compose
find ~/.lando/bin -type f -name 'docker-compose-v2*' -exec {} version \;

# Should have created the Lando Development CA
stat ~/.lando/certs/LandoCA.crt

# Should have installed the Lando Development CA
openssl x509 -in /etc/ssl/certs/LandoCA.pem -text -noout | grep -A 1 "Issuer:" | grep "Lando Development CA"

# Should have created the Landonet
docker network ls | grep lando_bridge_network

# Should be able to start a basic app
lando start
```
