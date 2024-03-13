Setup macOS Tests
=================

This example exists primarily to test the following documentation:

* [lando setup](https://docs.lando.dev/cli/setup.html)

Verification commands
---------------------

Run the following commands to validate things are rolling as they should.

```bash
# Should dogfood the core plugin we are testing against
lando plugin-add "@lando/core@file:${GITHUB_WORKSPACE}"

# Should be able to uninstall docker engine succesfully
brew uninstall --force --ignore-dependencies docker-desktop
brew list --versions docker-desktop || echo $? | grep 1

# Should be able to run lando setup
lando setup -y
```
