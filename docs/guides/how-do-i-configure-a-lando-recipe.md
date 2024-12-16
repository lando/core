---
title: How do I configure a Lando Recipe?
description: Using the lando config key to configure your recipe.
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

# How do I configure a Lando Recipe?

When you first initialize a lando app (`lando init`) you get a very simple `.lando.yml` configuration file. Here is the `.lando.yml` file for the LAMP recipe.

```yaml
name: mylamp
recipe: lamp
config:
  webroot: .
```

By using the `config` key in the `lando.yml` file you can configure aspects of your app to say match the production instance. For example say your production server
is using PHP 5.6; you can set that under the `config` key like so:

```yaml
name: mylamp
recipe: lamp
config:
  webroot: .
  php: 5.6
```

Now be sure to `rebuild` your app so that the new changes take effect:

```bash
lando rebuild -y
```

You can check that the change took by using `lando php -v`:

```bash
└─ $ ∴ lando php -v
PHP 5.6.40 (cli) (built: Jan 23 2019 00:10:05)
Copyright (c) 1997-2016 The PHP Group
Zend Engine v2.6.0, Copyright (c) 1998-2016 Zend Technologies
    with Zend OPcache v7.0.6-dev, Copyright (c) 1999-2016, by Zend Technologies
```

Similarly you can pin down the database backend and version of your app. Say you want MariaDB 10.3:

```yaml
name: mylamp
recipe: lamp
config:
  webroot: .
  php: 5.6
  database: mariadb:10.3
```

Again rebuild for the changes: `lando rebuild -y` and 💥 you now have PHP 5.6 and MariaDB 10.3!
