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
lando info -s db | grep -z imagefile: | grep core/examples/l337/Dockerfile
lando info -s db | grep image: || echo $? | grep 1
lando info -s db | grep primary: | grep false
lando info -s db | grep appMount: || echo $? | grep 1
lando info -s web | grep api: | grep 4
lando info -s web | grep type: | grep l337
lando info -s web | grep lastBuild: | grep never
lando info -s web | grep image: | grep nginx:
lando info -s web | grep imagefile: || echo $? | grep 1
lando info -s web | grep primary: | grep true
lando info -s web | grep appMount: | grep /site

# should start again successfully
lando start

# should have correct info when built
lando info
lando info -s db | grep api: | grep 4
lando info -s db | grep type: | grep l337
lando info -s db | grep lastBuild: | grep succeeded
lando info -s db | grep imagefile: | grep core/examples/l337/Dockerfile
lando info -s db | grep -z image: | grep lando/l337-2319fdf2cbc67f0421041eb62480226575dfc358-db:latest
lando info -s db | grep primary: | grep false
lando info -s db | grep appMount: || echo $? | grep 1
lando info -s web | grep api: | grep 4
lando info -s web | grep type: | grep l337
lando info -s web | grep lastBuild: | grep succeeded
lando info -s web | grep image: | grep nginx:
lando info -s web | grep -z imagefile: | grep .lando/v4/l337-2319fdf2cbc67f0421041eb62480226575dfc358/build-contexts/web/Imagefile
lando info -s web | grep primary: | grep true
lando info -s web | grep appMount: | grep /site

# should stop and start successfully
lando stop
lando start

# should restart successfully
lando restart

# should rebuild successfully
lando rebuild -y

# should be able to ssh into a service without -s arg
lando ssh -c "true"

# should run tooling commands in tooling.dir then service.appMount then service.working_dir
true

# should fail running tooling commands if no dir is specified
true

# should run api 3 and 4 services together in peace and security
lando info -s php | grep api | grep 3
lando info -s web | grep api | grep 4
lando info -s db | grep api | grep 4

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
