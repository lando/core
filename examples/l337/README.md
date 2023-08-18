L337 Example
============

This example exists primarily to test the v3 runtime implementation of following documentation:

[Lando Docker Compose 3 Engineering Terminology](core/v4/landofile/services.html#l337-service)

Start up tests
--------------

```bash
# should start successfully
lando poweroff
DOCKER_BUILDKIT=0 lando start -vvv
```

Verification commands
---------------------

Run the following commands to verify things work as expected

```bash
# should run api 3 and 4 services together in peace and security
lando info -s php | grep api | grep 3
lando info -s web | grep api | grep 4
lando info -s db | grep api | grep 4
```


# should allow top level volume creation
docker volume ls | grep l337_my-data

# should allow top level network creation
docker network ls | grep l337_my-network

# shoud allow short form registry image
lando ssh -s image-1 -c "env" | grep NGINX_VERSION | grep 1.21.
lando ssh -s image-1 -c "env" | grep PIKE | grep MOUNT

# shoud allow short form dockerfile
lando ssh -s image-2 -c "env" | grep NGINX_VERSION | grep 1.19.
lando ssh -s image-2 -c "env" | grep KIRK | grep SHATNER

# shoud allow short form docker instructions
lando ssh -s image-3 -c "env" | grep NGINX_VERSION | grep 1.20.
lando ssh -s image-3 -c "env" | grep SPOCK | grep NIMOY

# shoud allow long form registry image
lando ssh -s image-4 -c "env" | grep NGINX_VERSION | grep 1.21.
lando ssh -s image-4 -c "env" | grep PIKE | grep MOUNT

# shoud allow long form dockerfile
lando ssh -s image-5 -c "env" | grep NGINX_VERSION | grep 1.19.
lando ssh -s image-5 -c "env" | grep KIRK | grep SHATNER

# shoud allow long form docker instructions
lando ssh -s image-6 -c "env" | grep NGINX_VERSION | grep 1.20.
lando ssh -s image-6 -c "env" | grep SPOCK | grep NIMOY

# shoud allow interoperability with build and dockerfile
lando ssh -s image-7 -c "env" | grep NGINX_VERSION | grep 1.21.
lando ssh -s image-7 -c "env" | grep SPOCK | grep NIMOY

# shoud rebuild successfully
lando rebuild -y

Destroy tests
-------------

```bash
# should destroy successfully
lando destroy -y
lando poweroff
```
