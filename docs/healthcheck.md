---
title: Healthcheck
description: Configure Lando 3 service healthchecks
---

# Healthcheck

You can optionally add a `healthcheck` to any Lando `service`. This helps bridge the gap between when a service has _started_ and when it is _ready_.

While this is not essential for every `service` it is useful in cases where you need to make sure things are in a good state before you proceed.

A good example is a `post-start` event that sanitizes a database. If you do not wait for the database to be ready then that `post-start` event _may_ fail if it loses the "did I run before the database is ready race"?

## Command

To add a `healthcheck` to a service you must specific a `command` which can be done a few ways:

```yaml
services:
  database1:
    api: 3
    type: mariadb:10.4
    healthcheck: "mysql -uroot --silent --execute "SHOW DATABASES;"
  database2:
    api: 3
    type: mariadb:10.4
    healthcheck:
      command: mysql -uroot --silent --execute "SHOW DATABASES;"
  database3:
    api: 3
    type: mariadb:10.4
    healthcheck:
      - mysql
      - -uroot
      - --silent
      - --execute
      - SHOW DATABASES;
```

Note that these are equivalent `commands`. Also note that the `array` format can be used in either `healthcheck` or `healthcheck.command`.

## User

By default all `healthcheck` commands are run as `root` however you can modify this using the `object` form of `healthcheck` as below.

```yaml
services:
  database1:
    api: 3
    type: mariadb:10.4
    healthcheck:
      command: "mysql -uroot --silent --execute "SHOW DATABASES;"
      user: mysql
```

## Retries

By default each healthcheck will be retried `25` times with a `1000` millisecond delay between retries but you can change this behavior as below.

```yaml
services:
  database1:
    api: 3
    type: mariadb:10.4
    healthcheck:
      command: "mysql -uroot --silent --execute "SHOW DATABASES;"
      retries: 100
      delay: 10
```

## Using the legacy healthcheck

You can also elect to use the legacy pre-3.20.0 healthcheck by editing the Lando [global configuration](./global.md).

**config.yml**

```yaml
healthcheck: legacy
```

Alternatively you can use the legacy scanner by setting the environment variable `LANDO_HEALTHCHECK` to `legacy`. Here is a use-at-start example:

```bash:no-line-numbers
LANDO_HEALTHCHECK=legacy lando start
```

You can see whether the legacy scanner is being used with `lando config` and looking for the `scanner` key.

Note that the key will only be set if you elected to use the `legacy` scanner.

```bash:no-line-numbers
lando config --path healthcheck
```
