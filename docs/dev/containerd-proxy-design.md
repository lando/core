# Containerd Proxy (Traefik) Design

How Lando's Traefik proxy works with the containerd backend.

## Overview

Lando uses Traefik as a reverse proxy to route `*.lndo.site` hostnames to the correct container port. Traefik uses the **Docker provider** (`--providers.docker=true`) to discover containers by watching the Docker socket and reading container labels.

When Lando uses the containerd backend, **finch-daemon** provides a Docker API v1.43 compatibility layer on a Unix socket. Traefik talks to finch-daemon as if it were Docker — no Traefik configuration changes are needed.

## Architecture

```
Browser → http://myapp.lndo.site
    │
    ▼
Traefik (landoproxyhyperion5000gandalfedition-proxy-1)
    │  reads labels from containers
    │  via Docker provider
    │
    ▼
/var/run/docker.sock (inside container)
    │  mounted from host
    │
    ▼  (volume mount differs by backend)
Docker backend:      /var/run/docker.sock  ──► dockerd
Containerd backend:  /run/lando/finch.sock ──► finch-daemon ──► containerd
```

## How It Works

### 1. Socket Mapping

The `lando-set-proxy-config.js` hook detects the containerd backend and sets `lando.config.dockerSocket` to the finch-daemon socket path:

```js
// hooks/lando-set-proxy-config.js
if (backend === 'containerd') {
  lando.config.dockerSocket = getContainerdPaths(lando.config).finchSocket;
  // → /run/lando/finch.sock
}
```

The `_proxy` builder uses this to mount the correct host socket into the Traefik container:

```js
// builders/_proxy.js
volumes: [
  `${dockerSocket || '/var/run/docker.sock'}:/var/run/docker.sock`,
]
```

**Result:** Inside the Traefik container, `/var/run/docker.sock` always points to the active Docker-compatible API — whether that's Docker's real socket or finch-daemon's.

### 2. CNI Network Bridging

**The gap:** docker-compose via finch-daemon creates networks at the Docker API level but NOT at the CNI level. The nerdctl OCI runtime hook needs CNI conflist files for container networking.

**The fix:** `ContainerdProxyAdapter.ensureProxyNetworks()` pre-creates CNI configs for the proxy's `_edge` network before the proxy container starts:

```
/etc/cni/net.d/finch/nerdctl-landoproxyhyperion5000gandalfedition_edge.conflist
```

This is called from `app-start-proxy.js` when the containerd backend is detected.

### 3. Bridge Network DNS Aliases

The `app-add-proxy-2-landonet.js` hook connects the proxy container to the Lando bridge network with DNS aliases for each proxied hostname. This enables container-to-container routing (e.g., one service calling another by its proxy hostname).

This hook works identically for both backends because:
- `lando.engine.getNetwork()` returns a Dockerode-compatible handle for both Docker and containerd
- For containerd, `ContainerdContainer.getNetwork()` provides `connect()` and `disconnect()` methods backed by finch-daemon's Docker API

### 4. Container Discovery

Traefik discovers containers using the Docker events API (`GET /events`). finch-daemon implements this endpoint, so Traefik dynamically picks up new containers as they start.

Each proxied service gets Traefik labels added by `app-start-proxy.js`:

```
traefik.enable=true
traefik.docker.network=landoproxyhyperion5000gandalfedition_edge
traefik.http.routers.<id>.rule=HostRegexp(`myapp.lndo.site`)
traefik.http.routers.<id>.entrypoints=http
traefik.http.services.<id>-service.loadbalancer.server.port=80
```

These labels are set on the container via docker-compose, which goes through finch-daemon. Traefik reads them from finch-daemon's container inspect API — same format as Docker.

## Files

| File | Role |
|------|------|
| `lib/backends/containerd/proxy-adapter.js` | CNI network pre-creation for proxy networks |
| `hooks/lando-set-proxy-config.js` | Sets `dockerSocket` to finch-daemon path for containerd |
| `hooks/app-start-proxy.js` | Starts Traefik, adds labels; calls proxy adapter for containerd CNI |
| `hooks/app-add-proxy-2-landonet.js` | Connects proxy to bridge network (works for both backends) |
| `builders/_proxy.js` | Generates Traefik compose service with socket mount |

## Containerd-Specific Concerns

### finch-daemon Events API

Traefik's Docker provider uses a long-lived connection to `/events` to watch for container start/stop. If finch-daemon's events implementation has gaps, Traefik may miss containers that start after the proxy.

**Mitigation:** If events don't work, restarting the proxy (`lando restart` or stopping/starting the app) forces Traefik to re-scan all containers.

### CNI Network Timing

CNI configs must exist BEFORE docker-compose creates containers on a network. The proxy adapter creates them proactively in `app-start-proxy.js`. The `app-add-proxy-2-landonet.js` hook also ensures the bridge network has a CNI config.

### No nerdctl, No sudo

Per the BRIEF's prime directives:
- No nerdctl shellouts from user-facing code
- No sudo in runtime code paths
- All operations go through finch-daemon's Docker API (Dockerode) or docker-compose with `DOCKER_HOST`
