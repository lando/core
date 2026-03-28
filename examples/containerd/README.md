# Containerd Example

This example exists primarily to test the following documentation:

* [Containerd Backend](https://docs.lando.dev/getting-started/containerd.html)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
lando poweroff
LANDO_ENGINE=containerd lando setup -y --skip-common-plugins
LANDO_ENGINE=containerd lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should have installed containerd binary
stat /usr/local/lib/lando/bin/containerd

# Should have installed buildkitd binary
stat /usr/local/lib/lando/bin/buildkitd

# Should have installed runc binary
stat /usr/local/lib/lando/bin/runc

# Should have installed nerdctl binary
stat ~/.lando/bin/nerdctl

# Should have installed finch-daemon binary
stat /usr/local/lib/lando/bin/finch-daemon

# Should have installed docker-compose binary
find ~/.lando/bin -type f -name 'docker-compose-v2*' | grep docker-compose

# Should have the lando-containerd systemd service running
systemctl is-active --quiet lando-containerd.service

# Should have the containerd socket available
stat /run/lando/containerd.sock

# Should have the buildkitd socket available
stat /run/lando/buildkitd.sock

# Should have the finch-daemon socket available
stat /run/lando/finch.sock

# Should have created the Lando Development CA
stat ~/.lando/certs/LandoCA.crt

# Should report containerd as the engine backend
LANDO_ENGINE=containerd lando config | grep "engine" | grep containerd

# Should have running containers
DOCKER_HOST=unix:///run/lando/finch.sock $(find ~/.lando/bin -type f -name 'docker-compose-v2*' | head -1) -p landocontainerd ps | grep -i "up\|running"

# Should be able to list containers via lando
LANDO_ENGINE=containerd lando list | grep landocontainerd

# Should serve content from the web service
curl -s "$(LANDO_ENGINE=containerd lando info -s web --format json | grep -o 'http://[^"]*' | head -1)" | grep "CONTAINERD WORKS"

# Should be able to stop and restart cleanly
LANDO_ENGINE=containerd lando stop
LANDO_ENGINE=containerd lando start
LANDO_ENGINE=containerd lando list | grep landocontainerd

# Should be able to run commands inside containers
LANDO_ENGINE=containerd lando exec web -- cat /usr/share/nginx/html/index.html | grep "CONTAINERD WORKS"

# Should have the containerd service still running after lando operations
systemctl is-active --quiet lando-containerd.service

# Should NOT have interfered with system docker
docker info
```

## Destroy tests

```bash
# Should destroy successfully
LANDO_ENGINE=containerd lando destroy -y
LANDO_ENGINE=containerd lando poweroff
```
