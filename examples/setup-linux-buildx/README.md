# Setup Linux Buildx Tests

This example exists primarily to test that `lando setup` correctly installs buildx when it is not present.

* [lando setup](https://docs.lando.dev/cli/setup.html)

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should dogfood the core plugin we are testing against
lando plugin-add "@lando/core@file:../.."

# Should have buildx installed by default on GitHub runners
docker buildx version

# Should be able to remove buildx
rm -f ~/.docker/cli-plugins/docker-buildx
sudo rm -f /usr/local/lib/docker/cli-plugins/docker-buildx
sudo rm -f /usr/local/libexec/docker/cli-plugins/docker-buildx
sudo rm -f /usr/lib/docker/cli-plugins/docker-buildx
sudo rm -f /usr/libexec/docker/cli-plugins/docker-buildx

# Should confirm buildx is no longer available
(docker buildx version 2>&1 || true) | tee >(cat) | grep -i "not found\|is not a docker command\|unknown command"

# Should be able to run lando setup and have it reinstall buildx
lando setup -y --skip-common-plugins

# Should have buildx installed again
docker buildx version
```
