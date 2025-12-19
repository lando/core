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
docker buildx version 2>&1 | grep -i "not found\|is not a docker command\|unknown command" || echo "buildx not found"

# Should be able to run lando setup and have it reinstall buildx
lando setup -y --skip-common-plugins

# Should have buildx installed again
docker buildx version

# Should have installed buildx to the correct location
stat ~/.docker/cli-plugins/docker-buildx
```
