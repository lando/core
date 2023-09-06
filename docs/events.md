---
title: Events
description: Lando events let you run arbitrary commands before or after certain parts of the Lando runtime; clear caches after a database import or run a script before deployment.
---

# Events

::: tip When should I use events instead of a build step?
Unlike [build steps](./services.md#build-steps) `events` will run **every time** so it is advisable to use them for automating common steps like compiling `sass` before or after your app starts and not installing lower level dependencies like `node modules` or `php extensions`.
:::

Events allow you to automate commands or tasks you might often or always run either `before` or `after` something happens. Generally, you can hook into `pre` and `post` events for every part of the Lando and App runtime. At time of writing, those events were as follows:

| **LANDO** | **APP** |
| -- | -- |
| pre-bootstrap-config | pre-destroy |
| pre-bootstrap-tasks |  post-destroy |
| pre-bootstrap-engine | pre-init |
| pre-bootstrap-app | post-init |
| post-bootstrap-config | pre-rebuild |
| post-bootstrap-tasks | post-rebuild |
| post-bootstrap-engine | pre-start |
| post-bootstrap-app | post-start |
| pre-engine-build | pre-stop |
| post-engine-build | post-stop |
| pre-engine-destroy | pre-uninstall |
| post-engine-destroy | post-uninstall |
| pre-engine-run | ready |
| post-engine-run |  |
| pre-engine-start |  |
| post-engine-start |  |
| pre-engine-stop |  |
| post-engine-stop |  |

You can also hook into `pre` and `post` events for all [tooling](./tooling.md) commands. For example, the command `lando db-import` should expose `pre-db-import` and `post-db-import`.

## Discovering Events

While the above lists are great starting point, they may be out of date. You can explicitly discover what events are available by running as shown below:

```bash
# Discover hookable events for the `lando start` command
lando start -vvv | grep "Emitting"

# Discover hookable events for the `lando test` command
# NOTE: This assumed you've defined a `test` command in tooling
lando test -vvv | grep "Emitting"
```

Specifically, you need to hook into an event where the service you are running the command against exists and is running.

## Usage

It's fairly straightforward to add events to your [Landofile](./index.md) using the `events` top level config.

Note that due to the nature of events eg automating steps that the _user_ usually runs, all commands are run as "you" and do not have `sudo` or `root` access. In Lando 4 this will likely change.

Also note that some events are "silly" eg you will find it difficult to use the `post-destroy` event.

### Default commands

If you do not specify a [service](#service-commands) then the command will run on the [default service](./services.md#default-service). Generally this will be the `appserver` service.

```yaml
events:
  pre-start:
    - yarn install
    - echo "I JUST YARNED"
```

An exception for this is events that are based on [tooling](./tooling.md) commands which will use the tooling `service` as the default.

```yaml
events:
  post-thing:
    - some-command
tooling:
  thing:
    service: web
```

In the above scenario, `some-command` will run on the `web` service by default instead of the `appserver`. For [dynamic tooling routes](./tooling.md#dynamic-service-commands), events will use the default of the dynamic route.

```yaml
events:
  post-dynamic:
    - some-command
tooling:
  dynamic:
    cmd: env
    service: :host
    options:
      host:
        default: web2
        alias:
          - h
        describe: Run a different service
```

In the above `lando dynamic` scenario, `some-command` will run on `web2` by default. However if you run `lando dynamic --host web` then `some-command` will run on `web`.

### Service commands

:::tip Make it explicit!
While the defaults above are good to know, we *highly recommend* you just explicitly define which commands should run on which services by keying the command with a service as shown below.
:::

```yaml
events:
  pre-start:
    - appserver: composer install
    - database: echo "I JUST COMPOSERED"
  post-start:
    - node: yarn sass
    - appserver: composer compile-templates
```

