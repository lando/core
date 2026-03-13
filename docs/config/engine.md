---
title: Engine
description: How to configure the Lando container engine backend (Docker or containerd)
---

# Engine

Lando supports multiple container engine backends. By default it uses [Docker](https://www.docker.com/) but can also use [containerd](https://containerd.io/) with [nerdctl](https://github.com/containerd/nerdctl) as an alternative runtime.

The engine backend can be configured via the `engine` key in the [global config](global.md) or per-project in your `.lando.yml`.

## Available Values

| Value | Description |
|---|---|
| `auto` | **(default)** Auto-detects the best available backend. Prefers containerd if all binaries are found, otherwise falls back to Docker. |
| `docker` | Always use the Docker daemon and Docker Compose. This is the traditional Lando behavior. |
| `containerd` | Use Lando's own isolated containerd + buildkitd + nerdctl stack. |

## Configuration

**Global config (~/.lando/config.yml)**

```yaml
# use auto-detection (default)
engine: auto

# force Docker
engine: docker

# force containerd
engine: containerd
```

**Per-project (.lando.yml)**

```yaml
name: my-app
engine: containerd
services:
  web:
    type: php:8.2
    via: nginx
```

## Auto-Detection

When `engine` is set to `auto` (the default), Lando checks for the presence of three binaries inside `~/.lando/bin/`:

1. `containerd` — the container runtime daemon
2. `nerdctl` — the Docker-compatible CLI for containerd
3. `buildkitd` — the image build daemon

If **all three** binaries exist, Lando uses the containerd backend. If any are missing, it falls back to Docker.

::: tip
The containerd binaries are installed automatically by `lando setup` when containerd support is enabled. You don't need to install them manually.
:::

## Overriding Binary Paths

If your containerd stack binaries are installed in a non-standard location, you can override each path individually in the [global config](global.md):

```yaml
# Override individual binary paths
containerdBin: /usr/local/bin/containerd
nerdctlBin: /usr/local/bin/nerdctl
buildkitdBin: /usr/local/bin/buildkitd

# Override the containerd socket path
containerdSocket: /run/containerd/containerd.sock
```

By default, Lando looks for binaries in `~/.lando/bin/` and manages its own isolated containerd socket at `~/.lando/run/containerd.sock`.

## How It Works

When using the containerd backend, Lando:

1. Starts its **own isolated** containerd and buildkitd daemons (separate from any system containerd)
2. Uses `nerdctl compose` instead of `docker compose` for service orchestration
3. Uses `nerdctl` instead of `docker` for container inspection, listing, and management
4. Manages all state in `~/.lando/` to avoid interfering with system containers

The containerd backend is fully compatible with existing Lando apps and compose files — no changes to your `.lando.yml` services are required.

::: warning EXPERIMENTAL
The containerd engine backend is experimental. While it is designed to be a drop-in replacement for the Docker backend, some edge cases may behave differently. Please report any issues you encounter.
:::
