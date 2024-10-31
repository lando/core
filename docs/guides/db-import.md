---
title: SQL Import
description: Learn how to import your MySQL, MariaDB or Postgres databases to Lando.
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

# SQL Import

Lando ships with a helper `db-import` script that is available in all our `LAMP` and `LEMP` based recipes. Used in the recipe context it should import a database dump into the recipe-provided database by default but can be used on additional database services as well.

You can also import databases into other hosts and databases. It will currently handle uncompressed, gzipped or zipped dump files.

**This command will wipe out the target database before it runs the import unless you use the `--no-wipe` flag!**

## Usage

```bash
lando db-import somedumpfile.sql.gz
```

::: warning DB dump must reside within app directory!
Due to restrictions in how Docker handles file sharing your database dump **MUST** exist somewhere inside of your app directory. This means that **IT IS A VERY GOOD IDEA** to make sure you add SQL dumps to your `.gitignore` file.
:::

### Examples

```bash
# Import a file into the recipe-provided db
lando db-import dump.sql

# Import a file into an auxiliary second database called 'db2'
# with a db called `dataz`
lando db-import dump.zip --host db2

# Import without destroying the target database
lando db-import dump.zip --no-wipe

# Import using an absolute path
# NOTE: this is an absolute path in the target container, not on you host
lando db-import /db/dump.zip

# Import from a subdirectory
lando db-import subdir/test.sql

# Pipe stdout into db-import
# NOTE: this is a bit finicky right now
cat dump.sql | lando db-import
```

### Options

```bash
Options:
  --host, -h      The database service to use                  [default: "database"]
  --no-wipe       Do not destroy the existing database before an import
```

## Adding the `db-import` command

If you are not using one of our LAMPy [recipes](https://docs.lando.dev/config/recipes.html) you can add the `db-import` command and default options to the ['tooling'](https://docs.lando.dev/config/tooling.html) section of your [Landofile](https://docs.lando.dev/config/lando.html).

```yaml
tooling:
  'db-import <file>':
    service: :host
    description: Imports a dump file into a database service
    cmd: /helpers/sql-import.sh
    user: root
    options:
      host:
        description: The database service to use
        default: database
        alias:
          - h
      no-wipe:
        description: Do not destroy the existing database before an import
        boolean: true
```
