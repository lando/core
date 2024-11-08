---
title: Updating Lando Plugins to v4
description: Learn how to update Lando Plugins to be Lando 3.21.0+ eg Lando 4 compatible

authors:
  - name: Team Lando
    pic: https://gravatar.com/avatar/c335f31e62b453f747f39a84240b3bbd
    link: https://twitter.com/devwithlando
updated:
  timestamp: 1710252932580

mailchimp:
  # action is required
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  # everything else is optional
  title: Want similar content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# Updating Lando Plugins to v4

This guide should be your source of truth for updating your Lando plugins to be compatible with the forthcoming Lando 4 plugin spec.

Importantly, The Lando 4 plugin spec will be **REQUIRED** for your plugin to work in Lando 4 and it will be _preferred_ for Lando 3 version 3.21.0 or higher.

::: tip Check back periodically for updates!
As we continue the long, arduous and inexorable journey to Lando 4 we are going to continually update this guide so make sure you check in from time to time.
:::

We recommend you check out the [Lando 3.21.0+](#lando-3-21-0) section if you are _only_ looking to alleviate plugin notices in Lando 3. If you are looking to start making your plugins Lando 4 compatible we recommend you read the sections below that.

Note that making your plugin Lando 4 compliant will also alleviate plugin notices in Lando 3. We've only provided the [Lando 3.21.0+](#lando-3-21-0) section as a `tl;dr` sort of thing.

[[toc]]

## Lando 3.21.0+

If you are getting a notice that your plugin is not Lando 4 compatible and you want to do something about it without reading _all the sections_ in this doc then you are in the right place.

However, before we begin we want you to know that this is just a notice and your plugin should still work in Lando 3. This means if you are fine seeing the notice you can actually do nothing, stop reading this and get on with your life.

If you are still reading we assume you would like to get rid of the notice. In which case all you need to do is create a `package.json` in the root directory of your plugin with the below content.

**package.json**
```json
{
  "name": "my-plugin",
  "lando": {}
}
```

Note that you probably want to replace `my-plugin` with the name of your plugin, but other than that you should be good to go now! 🎉

If you are interested in understanding the above changes more you should check out the rest of this doc.

## Validating

In Lando 3 a "valid" plugin was simply a package that contained an `index.js` in its root directory. In Lando 4 plugin validation is different. While you no longer need an `index.js` for validation purposes you do now need:

### 1. A `package.json`

You will need a `package.json` in the root directory of your plugin that has _at least_ the `name` key set as in:

**package.json**
```json
{
  "name": "my-awesome-plugin"
}
```

That said you will almost always want the `package.json` to resemble a usual `node` project.

### 2. A plugin manifest

You will also need a plugin manifest that describes the kinds of things your plugin contains. Subsequent sections in this doc will detail the kinds of things you can put in the manifes. This section only details how to provide said manifest which is either in the `package.json` directly or in a manifest file.

#### package.json

The simplest way to provide the manifest is by adding a `lando` key to your `package.json`. A minimal valid implementation of a manifest is this:

```json
{
  "name": "my-awesome-plugin",
  "lando": {}
}
```

This is recommended for thin plugins that contain few things that can be statically defined.

#### manifest file

As your plugin grows in complexity it may be useful for readability and functional purposes to migrate to a manifest file. The manifest file should live in the root of your plugin next to the `package.json` and there are three different files you can use.

* `plugin.js`
* `plugin.yaml`
* `plugin.yml`

Lando will use the first one it finds according to the order above and its contents will be merged on top of any manifest content you have in your `package.json`. However, to decrease confusion we recommend you either remove the `lando` key from your `package.json` or set it to an empty `{}` object if you are planning on using a manifest file.

**plugin.js**

The `.js` variant is useful if your manifest is dynamic such as in the below example which adds extra commands only if `core.development` is on.

```js
module.exports = context => {
  const plugin = {
    name: '@lando/development',
    registry: {legacy: {}},
  };

  // if devmode is on then add dev command
  if (context.config.get('core.development')) {
    plugin.tasks = {
      'plugins': path.resolve(__dirname, 'tasks', 'plugins'),
      'registry': path.resolve(__dirname, 'tasks', 'registry'),
    };
  }

  // return plugin
  return plugin;
};
```

**plugin.yaml**

The `yaml|yml` variant is useful mostly for readability and separation of concerns purposes.

```yaml
name: "my-plugin"
tasks:
  full-power: ./tasks/power.js
services:
  localstack: ./services/locastack.js
```

## Updating

If you are deploying your plugin to a `npm` compatible registry and you want people to be able to update it via `lando update` then you need to update your `package.json` so that Lando knows it's a Lando plugin and not some other rando `npm` package.

If you are already using the `lando` key in your `package.json` as the plugin manifest then that is sufficient and you don't need to do anything else.

If you are instead using a manifest file like `plugin.js`, `plugin.yaml` or `plugin.yml` then you will need to add `lando-plugin` to `keywords` in your `package.json` like this:

```json
{
  "name": "my-awesome-plugin",
  "keywords": [
    "lando-plugin"
  ],
}
```
