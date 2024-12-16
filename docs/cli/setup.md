---
title: lando setup
description: lando setup installs the constituent components of Lando.
---

# lando setup

Installs and configures needed system dependencies and plugins so you can use `lando` such as:

* **Build Engine** - Docker Desktop on Windows and macOS, Docker Engine on Linux
* **Orchestrator** - Docker Compose v2
* **Common Plugins** - Basically all the plugins that used to be part of Lando Core before v3.21.0
* **Landonet** - A Docker bridge network for Lando container communication
* **Lando Development CA** - A Certificate Authority to sign and trust Lando certs

## Usage

```sh
lando setup
  [--build-engine <version>]
  [--build-engine-accept-license]
  [--orchestrator <version>]
  [--plugin <plugin>...]
  [--skip-common-plugins]
  [--skip-install-ca]
  [--yes]
```

## Options

```sh
--channel                      Sets the update channel                                              [array] [choices: "edge", "none", "stable"]
--clear                        Clears the lando tasks cache                                                                           [boolean]
--debug                        Shows debug output                                                                                     [boolean]
--help                         Shows lando or delegated command help if applicable                                                    [boolean]
--verbose, -v                  Runs with extra verbosity                                                                                [count]
--build-engine                 Sets the version of the build engine (docker-desktop) to install                    [string] [default: "4.32.0"]
--build-engine-accept-license  Accepts the Docker Desktop license during install instead of later                    [boolean] [default: false]
--orchestrator                 Sets the version of the orchestrator (docker-compose) to install                    [string] [default: "2.27.1"]
--plugin                       Sets additional plugin(s) to install                                                       [array] [default: []]
--skip-common-plugins          Disables the installation of common Lando plugins                                     [boolean] [default: false]
--skip-install-ca              Disables the installation of the Lando Certificate Authority (CA)                     [boolean] [default: false]
--yes, -y                      Runs non-interactively with all accepted default answers                              [boolean] [default: false]
```

## Examples

```sh
# Skip common lando plugins except php and mysql, run without prompts
lando setup --skip-common-plugins --plugin @lando/php --plugin @lando/mysql --yes

# Skip CA trust and install Docker Destkop 4.31.0 and accept its EULA
lando setup --skip-install-ca --build-engine 4.31.0 --build-engine-accept-license
```
