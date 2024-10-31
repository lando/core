---
title: SQL Export
description: Learn how to export your MySQL, MariaDB or Postgres databases from Lando.
guide: true

authors:
  - name: Team Lando
    pic: https://gravatar.com/avatar/c335f31e62b453f747f39a84240b3bbd
    link: https://twitter.com/devwithlando
updated:
  timestamp: 1594391902000

mailchimp:
  # action is required
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  # everything else is optional
  title: Want similar content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# SQL Export

Lando ships with a helper `db-export` script that is available in all our `LAMP` and `LEMP` based recipes. Used in the recipe context it should export a database dump `DATABASE.TIMESTAMP.gz` into the `/app` directory.

You can also export databases from other services.

## Usage

At the command line execute:

```bash
lando db-export
```

### Examples

```bash
# Export to a file named `DATABASE.TIMESTAMP.gz`
lando db-export

# Export to a file called dump.sql.gz
lando db-export dump.sql

# Export from a secondary database
lando db-export --host db2

# Dump the result to stdout
lando db-export --stdout

# Dump to an absolute path
# NOTE: this is an absolute path in the target container, not on you host
lando db-export /db/dump.zip
```

### Options

```bash
Options:
  --host, -h      The database service to use                  [default: "database"]
  --stdout        Dump database to stdout
```

## Adding the `db-export` command

If you are not using one of our LAMPy [recipes](https://docs.lando.dev/config/recipes.html) you can add the `db-export` command and default options to the ['tooling'](https://docs.lando.dev/config/tooling.html) section of your [Landofile](https://docs.lando.dev/config/lando.html).

```yaml
tooling:
  'db-export [file]':
    service: :host
    description: Exports database from a database service to a file
    cmd: /helpers/sql-export.sh
    user: root
    options:
      host:
        description: The database service to use
        default: database
        alias:
          - h
      stdout:
        description: Dump database to stdout
```
