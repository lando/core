Setup Windows Test
==================

This example exists primarily to test the following documentation:

* [lando setup](https://docs.lando.dev/cli/setup.html)

Verification commands
---------------------

Run the following commands to validate things are rolling as they should.

```bash
# Should dogfood the core plugin we are testing against
lando plugin-add "@lando/core@file:$CORE_PLUGIN_PATH"

# Should "uninstall" docker engine for windows
# Stop-Service -Name docker -Force
# Remove-Item -Path (Get-Command docker).Source -Force
true

# Should be able to run lando setup
lando setup --skip-common-plugins -y --debug

# Should be able to run lando start
lando start --debug

# Should be able to run powershell stuff
Get-Process
Get-Service
```
