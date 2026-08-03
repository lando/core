# Setup Windows Test

This example exists primarily to test the following documentation:

* [lando setup](https://docs.lando.dev/cli/setup.html)

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should dogfood the core plugin we are testing against
lando plugin-add "@lando/core@file:../.."

# Should be able to run lando setup
lando setup -y --skip-networking --skip-common-plugins

# Should have installed Docker Desktop
Test-Path "$env:ProgramFiles\\Docker\\Docker\\Docker Desktop.exe"
& "$env:ProgramFiles\\Docker\\Docker\\resources\\bin\\docker.exe" --version

# Should have installed Docker Compose
Get-ChildItem -Path "$HOME/.lando/bin" -Filter "docker-compose-v2*" -Recurse | ForEach-Object { & $_.FullName version }

# Should have created the Lando Development CA
Test-Path "$HOME/.lando/certs/LandoCA.crt"

# Should have installed the Lando Development CA
certutil -store Root | findstr /C:"Lando Development CA"
```
