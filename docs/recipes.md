---
title: Recipes
description: Lando recipes set sane defaults for common use cases like Drupal, WordPress or MEAN but are also highly configurable and extensible for all occasions.
---

# Recipes

Recipes are Lando's highest level abstraction and they contain common combinations of [routing](./proxy.md), [services](./services.md), and [tooling](./tooling.md). Said another way, recipes are common development use cases and starting points (e.g. `LAMP` or `Drupal 8`).

## Usage

You can use the top-level `recipe` config in your [Landofile](./index.md) to select a recipe. Note that you will need to select one of the [supported recipes](#supported-recipes) or [create your own](https://docs.lando.dev/contrib/contrib-plugins.html#recipes).

For example, we will use the [Drupal 8](./drupal8.md) recipe.

```yaml
recipe: drupal8
```

## Config

You can optionally configure some of the more obvious things in your recipe such as service versions, database types and config files using the top-level `config` config in your [Landofile](./index.md).

::: tip
While a decent amount config is the same from recipe to recipe, we recommend you consult the documentation for the recipe you intend to use for the full list of its config options.
:::

For example, some of the configurable things in the [LAMP](./lamp.md) recipe are shown below:

```yml
recipe: lamp
config:
  php: '5.6'
  webroot: www
  database: postgres:14
  xdebug: true
  config:
    php: config/php.ini
    database: config/mysql.cnf
    vhosts: config/vhosts.conf
```

## Supported Recipes

The following recipes are currently offered. Please check out each one to learn how to specifically use them.

* [Acquia](https://docs.lando.dev/acquia/)
* [Backdrop](https://docs.lando.dev/backdrop/)
* [Drupal 6](https://docs.lando.dev/drupal/)
* [Drupal 7](https://docs.lando.dev/drupal/)
* [Drupal 8](https://docs.lando.dev/drupal/)
* [Drupal 9](https://docs.lando.dev/drupal/)
* [Drupal 10](https://docs.lando.dev/drupal/)
* [Joomla](https://docs.lando.dev/joomla/)
* [Lagoon](https://docs.lando.dev/lagoon/) **(BETA)**
* [Laravel](https://docs.lando.dev/laravel/)
* [LAMP](https://docs.lando.dev/lamp/)
* [LEMP](https://docs.lando.dev/lemp/)
* [MEAN](https://docs.lando.dev/mean/)
* [Pantheon](https://docs.lando.dev/pantheon/)
* [Platform.sh](https://docs.lando.dev/platformsh/) **(BETA)**
* [Symfony](https://docs.lando.dev/symfony/)
* [WordPress](https://docs.lando.dev/wordpress/)

## Extending and Overriding Recipes

While the first Landofile below is totally valid and used by many people, there are even more people who set a recipe as a starting point for a more complex Landofile.

This is possible because recipes load all their stuff first. A consequence of that is that you can still mix in other [services](./services.md), [events](./services.md), [routing](./proxy.md) and [tooling](./tooling.md) or directly override the config provided by the recipe itself.

::: tip Service and Tooling discovery
Running `lando info` in your app directory is a good way to see what things your recipe offers. This is useful if you want to override or extend the things it provides, as in the example below:
:::

**That's cool bro...**

```yaml
name: my-app
recipe: laravel
```

**But it would be a lot cooler if you did this**

```yaml
name: myapp

# Start with the lamp recipe
recipe: lamp
config:
  php: '5.6'
  webroot: www
  database: postgres

# Add additional services
services:
  cache:
    type: redis
    persist: true
  node:
    type: node:16.13

  # Override our appserver to add some environmental variables
  # This service is provided by the lamp recipe
  appserver:
    overrides:
      environment:
        WORD: covfefe

# Add additional tooling
tooling:
  redis-cli:
    service: cache
  node:
    service: node
  npm:
    service: node
```
