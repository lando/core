---
title: Services
description: Lando services are a curated set of Docker containers like php, apache, node, mysql that are stupid easy to use but also as configurable as any other Docker image.
---

# Services

Lando services are our distillation of Docker containers into their most important options combined with some *special sauce* to setup good [networking](./networking.md), [certificates](./security.md) and [SSH keys](./ssh.md) as well as options to run [build steps](./lando-service.md#build-steps) and provide low level [overrides](./lando-service.md#overrides).

You can use the top-level `services` config in your [Landofile](./index.md) to define and configure a service.

## Configuration

Services will generally take the below form:

***Landofile***
```yaml
services:
  my-service:
    type: "my-type"
    api: 3
    ...
```

#### name

`my-service` is the `name` of the service and you can generally name the service whatever you want. We like short and kabob-cased names though.

#### api

`api` is the Service API version. If ommitted it will default to the app `runtime`.

However we **highly recommend** you **do not** omit it! :)

#### type

`type` is the kind of service. By default Lando 3 has one type: [`lando`](./lando-service.md)

However, you can install plugins to get more `types` such as `php:8.2` or `postgres:12`.

#### ...

`...` denotes additional configuration options that can vary based on the `type` of service you are using and other plugins you may have installed.

For these options you will want to consult the documentation for the specific service `type` or `plugin`.

## Lando Service

As mentioned above Lando 3 core ships with a single general purpose service called [`lando`](./lando-service.md). This service is similar to and replaces the now **DEPRECATED** [compose service](https://docs.lando.dev/compose/).

All other `api: 3` services are built on top of this service so it's worth examining its features as they are available in _all other_ downstream services. Some of its key features are:

* [Application Mounting](./lando-service.md#app-mount)
* [Build Steps](./lando-service.md#build-steps)
* [Healthcheck](./healthcheck.md)
* [SSL and Certs](./lando-service.md#ssl)
* [URL Scanning](./scanner.md)
* [Docker Compose Overrides](./lando-service.md#overrides)

That said, it's almost always better to use one of the [supported services](#supported-services) below if you can.

## Supported Services

The following services are currently supported. Please check out each one to learn how to use them.

*   ### [apache](https://docs.lando.dev/apache/)
*   ### [dotnet](https://docs.lando.dev/dotnet/)
*   ### [elasticsearch](https://docs.lando.dev/elasticsearch/)
*   ### [go](https://docs.lando.dev/go/)
*   ### [mailhog](https://docs.lando.dev/mailhog/)
*   ### [mariadb](https://docs.lando.dev/mariadb/)
*   ### [memcached](https://docs.lando.dev/memcached/)
*   ### [mongo](https://docs.lando.dev/mongo/)
*   ### [mssql](https://docs.lando.dev/mssql/)
*   ### [mysql](https://docs.lando.dev/mysql/)
*   ### [nginx](https://docs.lando.dev/nginx/)
*   ### [node](https://docs.lando.dev/node/)
*   ### [php](https://docs.lando.dev/php/)
*   ### [phpmyadmin](https://docs.lando.dev/phpmyadmin/)
*   ### [postgres](https://docs.lando.dev/postgres/)
*   ### [python](https://docs.lando.dev/python/)
*   ### [redis](https://docs.lando.dev/redis/)
*   ### [ruby](https://docs.lando.dev/ruby/)
*   ### [solr](https://docs.lando.dev/solr/)
*   ### [tomcat](https://docs.lando.dev/tomcat/)
*   ### [varnish](https://docs.lando.dev/varnish/)

## Default service

Some other Lando plugins, such as the one that powers [events](./events.md) will assume a _default_ service in some scenarios although it is not clear how this is set or determined. So, this is how that is determined

1. If there is a service called `appserver`, as is the case in most recipes, then that will be the default service.
2. If there is _not_ a service called appserver, then the first service listed in your `.lando.yml` will be the default service.

In Lando 4 you can choose the default service, now called the `primary` service by setting `primary: true` in that service.
