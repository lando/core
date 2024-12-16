---
title: Overriding a Service Version or Image
description: Modify the underlying Docker images used by your Lando services so that you can custom tailor the container environment for your apps!
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

# Overriding a Service Version or Image

The Docker images Lando uses for services are well optimized for local development, but occasionally you need to
override those images with some of your own secret sauce. Lando makes this easy to do through the services `overrides`
key:

```yaml
name: projectofdoom
recipe: drupal8
config:
  via: nginx
  webroot: web
  php: 7.3
  database: mariadb
  xdebug: true
env_file:
  - .env
services:
  database:
    overrides:
      image: bitnami/mariadb:10.3.27
```

In the example above, we're overriding the image to use an explicit release of Bitnami's MariaDB container to bypass a
breaking change released on Bitnami's 10.3 tag (Lando's default version).

You can also use this to load your own custom images:

```yaml
name: projectofdoom
recipe: drupal8
config:
  via: nginx
  webroot: web
  php: 7.3
  database: mariadb
  xdebug: true
env_file:
  - .env
services:
  appserver:
    overrides:
      image: myamazingorg/fancyappserver:latest
```
