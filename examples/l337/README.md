L337 Example
============

This example exists primarily to test the v3 runtime implementation of following documentation:

* [Lando 4 l337 service](https://docs.lando.dev/core/v4/landofile/services.html#l-337-service)

Start up tests
--------------

```bash
# should start successfully
lando poweroff
lando start
```

Verification commands
---------------------

Run the following commands to verify things work as expected

```bash
# should destroy successfully
lando destroy -y

# should have correct info when not built
lando info -s db | grep api: | grep 4
lando info -s db | grep type: | grep l337
lando info -s db | grep lastBuild: | grep never
lando info -s db | grep -z image: | grep core/examples/l337/Dockerfile
lando info -s db | grep primary: | grep false
lando info -s db | grep user: | grep www-data
lando info -s db | grep hostnames: | grep db.l337.internal
cat $(lando info -s db --path "[0].image" --format json | tr -d '"') | grep "ENV SERVICE=db"
lando info -s web | grep api: | grep 4
lando info -s web | grep type: | grep l337
lando info -s web | grep lastBuild: | grep never
lando info -s web | grep -z image: | grep Imagefile
lando info -s web | grep primary: | grep true
lando info -s web | grep appMount: | grep /site
lando info -s db | grep user: | grep nginx
lando info -s db | grep hostnames: | grep db.l337.internal
cat $(lando info -s web --path "[0].image" --format json | tr -d '"') | grep ENV | grep SERVICE | grep web

# should start again successfully
lando start

# should stop and start successfully
lando stop
lando start

# should restart successfully
lando restart

# should rebuild successfully
lando rebuild -y

# should have the correct info when built
lando info -s db | grep lastBuild: | grep succeeded
lando info -s web | grep lastBuild: | grep succeeded

# should use web as the primary service for tooling and events
lando ssh -c "env" | grep SERVICE | grep web
lando | grep SERVICE | grep web

# should allow legacy meUser to work like it does for v3
lando whoami | grep nginx

# should automatically set appMount if appRoot is volume mounted
lando pwd | grep /site

# should allow legacy moreHttpPorts to work like it does for v3
docker inspect l337_web_1 | grep io.lando.http-ports | grep "80,443,8888"

# should allow top level volume creation
docker volume ls | grep l337_my-data

# should allow top level network creation
docker network ls | grep l337_my-network
```

# should allow short form registry image
lando ssh -s image-1 -c "env" | grep NGINX_VERSION | grep 1.21.
lando ssh -s image-1 -c "env" | grep PIKE | grep MOUNT

# should allow short form dockerfile
lando ssh -s image-2 -c "env" | grep NGINX_VERSION | grep 1.19.
lando ssh -s image-2 -c "env" | grep KIRK | grep SHATNER

# should allow short form docker instructions
lando ssh -s image-3 -c "env" | grep NGINX_VERSION | grep 1.20.
lando ssh -s image-3 -c "env" | grep SPOCK | grep NIMOY

# should allow long form registry image
lando ssh -s image-4 -c "env" | grep NGINX_VERSION | grep 1.21.
lando ssh -s image-4 -c "env" | grep PIKE | grep MOUNT

# should allow long form dockerfile
lando ssh -s image-5 -c "env" | grep NGINX_VERSION | grep 1.19.
lando ssh -s image-5 -c "env" | grep KIRK | grep SHATNER

# should allow long form docker instructions
lando ssh -s image-6 -c "env" | grep NGINX_VERSION | grep 1.20.
lando ssh -s image-6 -c "env" | grep SPOCK | grep NIMOY

# should allow interoperability with build and dockerfile
lando ssh -s image-7 -c "env" | grep NGINX_VERSION | grep 1.21.
lando ssh -s image-7 -c "env" | grep SPOCK | grep NIMOY

Destroy tests
-------------

```bash
# should destroy successfully
lando destroy -y
lando poweroff
```
