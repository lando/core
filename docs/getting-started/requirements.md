---
title: Requirements
description: System requirements to run Lando on your machine
---

# Requirements

Lando is designed to work on a wide range of computers. Here are some basic guidelines to ensure your Lando experience is as smooth as possible.

## Hardware Requirements

::: warning Not for the faint of heart!
Note that Lando is basically a PaaS running on your computer and as such we don't recommend you use it [UNLESS YOU'VE GOT POWER!!!](https://www.youtube.com/watch?v=NowdrL6fvb4).
:::

### Minimum requirements

You _can_ run Lando using the below but your experience may be less than ideal.

* ARM64 or x64 processor(s) with 2+ cores
* 4GB+ RAM
* 25GB+ of available disk space

You _likely_ can run Lando on other processor architectures if you [install from source](https://docs.lando.dev/install/source.html) but this is not tested or supported.

### Preferred

We've found the below or better to deliver the best experience.

* ARM64 or x64 processor(s) with 8+ cores
* 16GB+ RAM
* 100GB+ of available disk space

## System Requirements

### Operating System

* macOS 12 or higher
* Windows 10 Home or Pro version 21H2 or higher with the [WSL2 feature enabled](https://learn.microsoft.com/en-us/windows/wsl/install)
* Linux with kernel version 4.x or higher

### Docker Engine Requirements

Please also verify you meet the requirements needed to run our Docker engine backend. Note that the macOS and Windows Lando installer scripts will install Docker for you if needed. You can also run [`lando setup`](https://docs.lando.dev/cli/setup.html) to install needed requirements.

* Docker Engine for Linux [requirements](https://docs.docker.com/engine/install/)
* Docker Desktop for Mac [requirements](https://docs.docker.com/desktop/install/mac-install/#system-requirements)
* Docker Desktop for Windows [requirements](https://docs.docker.com/desktop/install/windows-install/#system-requirements)

## Preflight Checks

1. Verify that your system meets the [minimum system and hardware requirements](#system-requirements) to run Lando.
2. Verify that you are connected to the internet.
3. Verify that you have administrative access to your machine.

### Optional checks

1. If you already have Docker installed it needs to be set to factory defaults.
2. If you are also running VirtualBox on Windows check out [this](./../help/win-also-vb.md).
