---
title: Lando Service
description: Lando 3 Core Lando Service
---

# Lando Service

The `lando` service is the lowest level `api: 3` service available in Lando.

Generally you will want to use a more specific service like `type: php` but this service can be good if you are:

* Thinking about contributing your own custom Lando service and just want to prototype something
* Using Docker Compose config from other projects
* Need a service not currently provided by Lando itself

It implements a super-set of the [Docker Compose Version 3 Spec](https://docs.docker.com/reference/compose-file/) and _usually_ requires some [slight tweaks](#caveats) of existing Docker Compose configuration to work correctly.

Here is a birds-eye view of all its options:

**Landofile**
```yaml
name: "my-app"
services:
  my-service:
    # set type and api
    api: 3
    type: lando

    # these directly map to docker compose things
    # see: https://docs.docker.com/reference/compose-file/
    # note that these are only available if you invoke the service directly
    services: {}
    networks: {}
    volumes: {}

    # below are features available in every api 3 service
    app_mount: cached
    # build steps
    build: []
    build_as_root: []
    run: []
    run_as_root: []
    # ssl
    ssl: false
    sslExpose: false
    # other
    meUser: www-data
    moreHttpPorts: []
    overrides: {}
```

## Services, Networks, Volumes

These three: `services,` `networks` and `volumes` map directly to the [Docker Compose Version 3 Spec](https://docs.docker.com/reference/compose-file/) which means that the below is a valid Landofile:

**Landofile**
```yaml
name: lampy
services:
  appserver:
    api: 3
    type: lando
    services:
      image: php:8.2-apache
      command: docker-php-entrypoint apache2-foreground
      ports:
        - 80
  database:
    api: 3
    type: lando
    services:
      image: mariadb:10.4
      command: docker-entrypoint.sh mysqld
```

Note that `services`, `volumes` and `networks` are _only_ available if you use this `service` directly with `type: lando`. If you are in an upstream service we recommend you use [`overrides`](#overrides).

Also note that there are a few caveats and behavioral considerations you should be aware of while using the above:

* [Setting the command](#setting-the-command)
* [Setting the app mount](#setting-the-app-mount)
* [Choosing the user](#choosing-the-user)

## App Mount

Lando will automatically mount your codebase in every container at `/app` using the `:cached` performance optimization flag.
However, you can change the mount flag on a per-service basis or disable the mount entirely if you so choose.

#### Do not mount my application code

Set `app_mount` to either `false` or `disabled`.

**Landofile**
```yaml
services:
  my-service:
    api: 3
    type: lando
    app_mount: false
    services:
      image: php:8.2-apache
      command: docker-php-entrypoint apache2-foreground
  my-service2:
    api: 3
    type: lando
    app_mount: disabled
    services:
      image: php:8.2-apache
      command: docker-php-entrypoint apache2-foreground
```

#### Mount with a different flag

Set `app_mount` to any valid Docker bind mount [third field](https://docs.docker.com/engine/storage/bind-mounts/).

**Landofile**
```yaml
services:
  my-service:
    api: 3
    type: lando
    app_mount: ro
    services:
      image: php:8.2-apache
      command: docker-php-entrypoint apache2-foreground
  my-service2:
    api: 3
    type: lando
    app_mount: delegated
    services:
      image: php:8.2-apache
      command: docker-php-entrypoint apache2-foreground
```

## Build Steps

One of the great features of Lando is its ability to destroy a single planet...  we mean add additional dependencies or build steps to your service without the hassle of having to build or manage your own Dockerfiles.

Note that build steps will **ONLY RUN THE FIRST TIME YOU SPIN UP YOUR APP.** That means if you change them, you will need to run `lando rebuild` for them to re-run. An exception to this is if one or more of your build steps error. When this happens Lando will run the build steps on every subsequent `lando start` until they complete without error.

:::tip When should I use build steps?
If you need additional on-server dependencies like php extensions or node modules, it sounds like a build step may be for you. If you have automation, you want to run **EVERY TIME** and you may want to consider using [events](../landofile/events.md) instead.
:::

There are four major build steps.

* `build` runs as "you" and *before* your service boots up
* `build_as_root` runs as `root` and *before* your service boots up
* `run` runs as "you" and *after* your service boots up
* `run_as_root` runs as `root` and *after* your service boots up

An example to consider is shown below:

**Landofile**
```yaml
services:
  appserver:
    api: 3
    type: lando
    services:
      image: php:8.2-apache
      command: docker-php-entrypoint apache2-foreground
    build_as_root:
      - apt-get update -y && apt-get install -y libmemcached-dev
      - pecl install memcached
      - docker-php-ext-enable memcached
    run:
      - composer install
  node:
    api: 3
    type: lando
    services:
      image: node:16
      command: yarn dev
    build:
      - yarn
    run:
      - /helpers/some-helper-script.sh
    run_as_root:
      - echo "127.0.0.1 mysite.lndo.site" >> /etc/hosts
```

As you can likely surmise from the above, each step is intended for a pretty specific use case:

* Use `build` to install application dependencies that are needed before you start your application
* Use `build_as_root` to install low level server packages required by your application
* Use `run` to install application dependencies or run build steps that require your application be started first
* Use `run_as_root` for any other post-start `root` level one-time setup commands.

Of course, these steps must make sense within the context of the container you are running them in. For example, you will not be able to run `dnf` inside of a `debian` flavored container.

Also, note that the default working directory that the commands run in inside the container is `/app`.

Another potential consideration is "dependent commands". Each line of a build step runs in a separate subshell; so if COMMAND B is dependent on something provided by COMMAND A such as `sourcing` a file, you should combine the commands with `&&` and put them on a single line.

### Using SCRIPTY things

While the following example *can* work, please note that it is **NOT SUPPORTED.**

```yaml
run:
  - |
    if [ ! -z $LANDO_MOUNT ]; then
      do something
      some other command
    fi
```

In these situations, it is **highly recommended** you create a script and reference that instead. This keeps things cleaner and more portable.

```bash
#!/bin/bash

if [ ! -z $LANDO_MOUNT ]; then
  do something
  some other command
fi
```

```yaml
run:
  - /app/my-script.sh
```

### Using Dockerfiles

If you find that your build steps are approaching the length of Herman Melville's seminal work [Moby Dick](https://www.youtube.com/watch?v=zg84olIrn-k), you can use [overrides](#overrides) to build directly from a Dockerfile instead.

This can keep your Landofile tidy and has the added benefit of your service being shippable like any Dockerfile.

An example that extends our base `php` image to add another extension is shown below:

##### Landofile

Note that `build` is going to be relative to your app root.

```yaml
services:
  appserver:
    api: 3
    type: lando
    overrides:
      build: ./php
      image: pirog/php:8.2-fpm-custom
```

##### Dockerfile

This lives inside of the `./php` directory referenced in the `build` above.

```bash
FROM devwithlando/php:8.2-fpm

RUN apt-get update -y \
  && docker-php-ext-install pcntl
```

## Entrypoint

By default, Lando will hijack the containers `entrypoint` as this is how it serves its _secret sauce_. This does introduce some different behavior when [setting the command](#setting-the-command) of your service.

You can, however, set a different entrypoint.

**Landofile**
```yaml
services:
  appserver:
    api: 3
    type: lando
    entrypoint: docker-php-entrypoint
    services:
      image: php:8.2-apache
      command: apache2-foreground
```

Note that the above example will lose any Lando functionality that is provided by our default `entrypoint`.

## Healthcheck

Since [Lando 3.20.0](https://github.com/lando/lando/releases/tag/v3.20.1) service URL scanning is [in its own plugin](../config/healthcheck).

## Localhost Assignment

By default Lando will attempt to assign `localhost` addresses to any service that has ports `80` or `443` exposed. You can tell Lando to assign `localhost` addresses to additional `http` ports with the following.

**Landofile**
```yaml
services:
  my-service:
    api: 3
    type: lando
    moreHttpPorts:
      - 8888
    services:
      image: php:8.2-apache
      command: apache2-foreground
      ports:
        - 8888
```

Note that if you are adding additional `moreHttpPorts` you **must** also make sure that `port` is exposed as in the example above.

## meUser

For the purposes of things like [events](../landofile/events.md) and [tooling](../landofile/tooling.md) you may wish to set the "non-root" user to run commands as "you".

**Landofile**
```yaml
services:
  my-service:
    api: 3
    type: lando
    meUser: node
    services:
      image: node:16
      command: npm start
```

By default `meUser` is set to `www-data` which exists in most services by default.

## SSL

You can tell Lando to create certificates to use with `ssl: true`. This will also automatically expose the `sport` which is `443` by default. The certificates will live in `/certs/*` inside the container.

**Landofile**
```yaml
services:
  my-service:
    api: 3
    type: lando

    # generate certificates
    ssl: true
    # expose this "secure port"
    sport: 3001
    # set to false to disable sport exposure
    sslExpose: true

    services:
      image: node:16
      command: npm start --https 3001
```

Note that this does not automatically set up the service to _use_ the certs, it merely creates the certs and exposes some ports. It is up to you to configure your service correctly to use them.

Also note that cert creation requires running the service as the `root` user. To work around this limitation check out [this](#choosing-the-user).

## URL Scanning

Since [Lando 3.14.0](https://github.com/lando/lando/releases/tag/v3.14.0) service URL scanning is [in its own plugin](../config/scanner).

## Overrides

Lando services are just an abstraction layer on top of the [Docker compose v3 file format](https://docs.docker.com/reference/compose-file/). What this means is that behind the scenes your Landofile is being translated into a *SHLOAD* of *SUPERNASTY* looking `docker-compose` files which are then being used to power your app.

We give you access to the Docker Compose layer with the `overrides` key.

::: tip You can only override Docker Compose's top-level `services` config
Overrides you specify get merged and injected directly into the `services` config used by Docker Compose. This means that you cannot use overrides to alter *top level* `networks` or `volumes`.
:::

Also note that if you are using this service directly it _probably_ makes more sense to just use [`services`, `networks` and `volumes`](#services-networks-volumes) directly. `overrides` is really meant to be used in downstream services as in the example below:

**Landofile**
```yaml
services:
  html:
    api: 3
    # note that setting custom as the service version
    # will automatically skip landos "supported" check
    type: apache:custom
    overrides:
      environment:
        STUFF: THINGS
        THINGS: GUYS
      image: pirog/myapache:2
      volumes:
        - ./mythings:/tmp/mythings
```

## Caveats

### Setting the command

By default, Lando will hijack the containers `entrypoint` as this is how it serves its _secret sauce_.

However, this means if your custom container sets its own entrypoint, you will need to remove that entrypoint and set it as the first argument in the `command`.

In the example below, `docker-php-entrypoint` is the default `entrypoint` for the `drupal:8` image but we have moved it so that it is the first argument of `command`. This both allows the container to run as expected and allows Lando to do its thing.

**Landofile**
```yaml
services:
  custom-service:
    api: 3
    type: lando
    services:
      image: drupal:8
      ports:
        - '80'
      # Required. See Below
      command: docker-php-entrypoint apache2-foreground
```

You can _probably_ force the original container behavior and by extention forego the Lando magic by explicitly resetting the [entrypoint](#entrypoint).

### Setting the app mount

Many Docker images will put code in `/app`. This directly conflicts with Lando's default codebase mount point. If you are running into a problem because of this collision, we recommend you [disable](#app-mount) the `app_mount` by setting it to `false` or `disabled`.

This will prevent Lando from mounting your codebase to `/app` so the Docker image can use its own code at `/app`.

**Landofile**
```yaml
services:
  pghero:
    api: 3
    type: lando
    app_mount: false
    services:
      image: ankane/pghero
      command: puma -C config/puma.rb
```

### Choosing the user

Many non-Lando containers do not run as the `root` user by default. This is OK but comes with a few caveats. The most relevant are that Lando will not be able to execute its normal boot up steps which:

* Map `host:container` user permissions
* Generate a certificate for the service
* Load user and lando managed SSH keys

Also note that containers that do not have `bash` installed, like some `alpine` ones, will similarly not be able to load up SSH keys.

These factors _may_ or _may not_ be relevant depending on what you are doing so they are here just as a FYI.

If you are using a container that **cannot** run as `root` but still want that Lando magic you can try something like below.

**Landofile**
```yaml
services:
  custom-service:
    api: 3
    type: lando
    services:
      user: root
      image: drupal:8
      # Required. See Below
      command: docker-php-entrypoint apache2-foreground
      ports:
        - '80'
      environment:
        LANDO_DROP_USER: otheruser
    volumes:
      my-volume:
    networks:
      my-network:
```

The relevant pieces here are setting `user: root` and then the environment variable `LANDO_DROP_USER` to whatever user the container is suppose to run as.

In this example the container will boot as `root` do the Lando things it needs to do and then run `docker-php-entrypoint apache2-foreground` as `otheruser`.

## Examples

Almost all of the [core tests](https://github.com/lando/core/tree/main/examples) use this service.

