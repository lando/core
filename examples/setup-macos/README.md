# Setup macOS Tests

This example exists primarily to test the following documentation:

* [lando setup](https://docs.lando.dev/cli/setup.html)

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should dogfood the core plugin we are testing against
lando plugin-add "@lando/core@file:../.."

# Should be able to uninstall docker desktop succesfully
brew uninstall --force --ignore-dependencies docker-desktop
brew list --versions docker-desktop || echo $? | grep 1

# Should be able to run lando setup
lando setup -y --skip-networking --skip-common-plugins

# Should have installed Docker Desktop
stat /Applications/Docker.app
docker --version

# Should have installed Docker Compose
find ~/.lando/bin -type f -name 'docker-compose-v2*' -exec {} version \;

# Should have created the Lando Development CA
stat ~/.lando/certs/LandoCA.crt

# Should have installed the Lando Development CA
security find-certificate -a -c "Lando Development CA" -p ~/Library/Keychains/login.keychain-db
```
