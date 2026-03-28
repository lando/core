---
title: Troubleshooting the Containerd Engine
description: How to diagnose and fix common issues with Lando's containerd engine backend.
---

# Troubleshooting the Containerd Engine

Lando's containerd backend runs its own isolated stack — containerd, buildkitd, and finch-daemon — managed by a systemd service. This page covers common issues and how to resolve them.

::: tip
Run `lando doctor` first. It checks for missing binaries, dead sockets, and unreachable daemons and will flag most problems automatically.
:::

## Quick Diagnostics

Before diving into specific errors, gather info:

```bash
# Check if the systemd service is running
systemctl is-active lando-containerd.service

# Check service logs
journalctl -u lando-containerd.service --no-pager -n 50

# Verify your user is in the lando group
groups | grep lando

# Check that sockets exist
ls -la /run/lando/

# Run lando's built-in diagnostics
lando doctor
```

## Containerd Is Not Running

**Error:** `containerd is not running`

The containerd daemon is not active. This usually means the systemd service has stopped or was never started.

**Fix:**

```bash
# Re-run setup to install and start the service
lando setup

# Or start the service directly if already installed
sudo systemctl start lando-containerd.service

# Check why it stopped
journalctl -u lando-containerd.service --no-pager -n 100
```

Common causes:
- The system was rebooted and the service wasn't enabled at boot. Run `sudo systemctl enable lando-containerd.service`.
- A configuration error is preventing startup. Check journalctl output for specifics.

## BuildKit Daemon Is Not Running

**Error:** `BuildKit daemon is not running`

buildkitd handles image builds. It runs as part of the `lando-containerd.service` — if containerd is running but buildkitd is not, the service may have partially failed.

**Fix:**

```bash
# Restart the entire service (it manages all three daemons)
sudo systemctl restart lando-containerd.service

# Check buildkitd-specific logs
journalctl -u lando-containerd.service --no-pager | grep buildkitd

# Verify the socket exists
ls -la /run/lando/buildkitd.sock
```

If the socket exists but buildkitd isn't responding, the process may have crashed. A service restart should recover it.

## finch-daemon Is Not Running

**Error:** `finch-daemon is not running`

finch-daemon provides Docker API compatibility — it's what lets docker-compose and Traefik talk to containerd. Without it, compose operations and the proxy will fail.

**Fix:**

```bash
# Restart the service
sudo systemctl restart lando-containerd.service

# Check finch-daemon logs
journalctl -u lando-containerd.service --no-pager | grep finch

# Verify the socket
ls -la /run/lando/finch.sock

# Test connectivity manually
curl --unix-socket /run/lando/finch.sock http://localhost/_ping
```

A successful ping returns `OK`. If it returns nothing or errors, finch-daemon has crashed or failed to bind to the socket.

## Binaries Not Found

**Error:** `containerd backend binaries not found`

One or more required binaries are missing. The containerd backend needs: `containerd`, `buildkitd`, `finch-daemon`, and `docker-compose`.

**Fix:**

```bash
# Re-run setup to install all binaries
lando setup

# Verify binaries exist
ls -la ~/.lando/bin/
```

`lando setup` installs binaries to `~/.lando/bin/` (user-level) and `/usr/local/lib/lando/bin/` (system-level). If you've moved or deleted them, setup will reinstall them.

::: tip
You can override binary paths in `~/.lando/config.yml` if your binaries are in a non-standard location. See the [engine configuration docs](../config/engine.md) for details.
:::

## Permission Denied

**Error:** `containerd requires elevated permissions`

Your user cannot access the containerd sockets. After `lando setup`, all runtime operations should work without sudo.

**Fix:**

```bash
# Check if your user is in the lando group
groups

# If 'lando' is not listed, add yourself
sudo usermod -aG lando $USER

# IMPORTANT: log out and log back in for the group change to take effect
# Or use newgrp as a quick test:
newgrp lando

# Verify socket permissions
ls -la /run/lando/
# Sockets should show group 'lando' with 660 permissions:
# srw-rw---- 1 root lando 0 ... containerd.sock
```

::: warning
You must log out and log back in (or reboot) after adding yourself to the `lando` group. Running `newgrp lando` in a single terminal is a quick test, but only a full re-login applies the change system-wide.
:::

If the sockets exist but have wrong permissions, re-run `lando setup` to fix them.

## Socket Conflict

**Error:** `containerd socket conflict detected`

Another containerd instance is using the same socket path, or stale socket files remain from a previous run.

**Fix:**

```bash
# Check what's using the socket
sudo fuser /run/lando/containerd.sock

# If it's a stale file, restart the service
sudo systemctl restart lando-containerd.service

# If another containerd is genuinely running on the same path, stop it
# Lando's sockets should be in /run/lando/ — not /run/containerd/
```

Lando uses `/run/lando/` specifically to avoid conflicts with system containerd (`/run/containerd/`) or Docker (`/var/run/docker.sock`). If something else is binding to `/run/lando/`, it's likely a leftover from a previous Lando installation.

## docker-compose Failed

**Error:** `docker-compose failed (containerd backend)`

docker-compose commands are failing when talking to finch-daemon. This is usually a connectivity or compatibility issue.

**Fix:**

```bash
# Verify finch-daemon is reachable
curl --unix-socket /run/lando/finch.sock http://localhost/_ping

# Test docker-compose directly
DOCKER_HOST=unix:///run/lando/finch.sock docker-compose version

# Run with verbose output to see the actual error
DOCKER_HOST=unix:///run/lando/finch.sock docker-compose -f .lando/compose/<your-app>/docker-compose.yml config
```

Common causes:
- finch-daemon is not running (see above)
- A service in your Landofile uses a Docker-only feature not yet supported by finch-daemon
- The compose file references images that haven't been built or pulled yet

## Component Update Warning

**Warning:** `Recommend updating <component>`

A containerd stack component is outdated. This doesn't prevent Lando from working but may cause stability issues.

**Fix:**

```bash
# Update all containerd components
lando setup --skip-common-plugins
```

This re-runs the setup hooks that install containerd, buildkitd, and finch-daemon, bringing them to the versions bundled with your Lando release.

## macOS: Lima VM Not Running

**Error:** `Lando Lima VM is not running`

On macOS, containerd runs inside a Lima VM (because containerd requires a Linux kernel). The VM has stopped or wasn't created.

**Fix:**

```bash
# Re-run setup to create/start the VM
lando setup

# Or start it manually
limactl start lando

# Check VM status
limactl list
```

If the VM exists but won't start, check Lima logs:

```bash
limactl shell lando -- journalctl --no-pager -n 50
# or
cat ~/.lima/lando/serial.log
```

## macOS: Lima Not Installed

**Error:** `Lima is required for containerd on macOS`

Lima is not installed. It's required for the containerd backend on macOS.

**Fix:**

```bash
# Install via lando setup (recommended)
lando setup

# Or install manually
brew install lima
```

After installing Lima, run `lando setup` again to create and configure the Lando VM.

## CNI Networking Issues

If containers start but can't communicate with each other or the host, the issue is likely CNI network configuration. finch-daemon creates networks at the Docker API level but doesn't automatically write the CNI config files that containerd's OCI hooks need.

**Symptoms:**
- Containers start but can't reach each other by service name
- Proxy (Traefik) can't route to app containers
- `lando start` succeeds but services timeout when connecting

**Fix:**

```bash
# Check if CNI configs exist
ls -la /etc/cni/net.d/finch/

# Check CNI directory permissions
stat /etc/cni/net.d/finch/

# If the directory is not group-writable for 'lando', fix permissions
sudo chgrp -R lando /etc/cni/net.d/finch/
sudo chmod -R g+w /etc/cni/net.d/finch/

# Re-run setup to fix permissions permanently
lando setup
```

::: warning
CNI directory permissions (`/etc/cni/net.d/finch/`) must allow the `lando` group to write. If `lando setup` hasn't set this up yet, you may need to fix permissions manually as shown above.
:::

## Logs Reference

All containerd backend logs are available through journald and Lando's own log directory:

| Log | How to access |
|---|---|
| systemd service | `journalctl -u lando-containerd.service` |
| containerd | `journalctl -u lando-containerd.service \| grep containerd` |
| buildkitd | `journalctl -u lando-containerd.service \| grep buildkitd` |
| finch-daemon | `journalctl -u lando-containerd.service \| grep finch` |
| Lando runtime | `~/.lando/logs/lando.log` |
| Lando errors | `~/.lando/logs/lando-error.log` |
| App-specific | `~/.lando/logs/<appname>.log` |

::: tip
For more verbose output, run your Lando command with `-vvvv`:

```bash
lando start -vvvv
```

This sets maximum log verbosity and often reveals the specific error behind a generic failure message.
:::

## Still Stuck?

If none of the above resolves your issue:

1. Run `lando doctor` and note any warnings or errors
2. Collect logs: `journalctl -u lando-containerd.service --no-pager > /tmp/lando-containerd.log`
3. Run the failing command with max verbosity: `lando start -vvvv 2>&1 | tee /tmp/lando-debug.log`
4. Report the issue with both log files at [github.com/lando/core/issues](https://github.com/lando/core/issues)
