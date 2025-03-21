---
title: Performance
description: If you've ever tried to run a site with a shload of files using Docker Desktop for Windows or macOS then you've likely experienced some of the very well documented performance issues associated with doing so.
---

# Performance

If you've ever tried to run a site with a shload of files using Docker Desktop then you've likely experienced some of the [very well documented](https://forums.docker.com/t/file-access-in-mounted-volumes-extremely-slow-cpu-bound/8076/89) performance issues associated with doing so. Usually, these performance issues manifest themselves in slow page load times, or exceptionally long cli operations like installing a dependency or clearing an application's cache.

Similarly, since Lando is built on top of these technologies, you likely have experienced them while running big sites on Lando as well; despite the fact that we already [optimize our app mounts](../services/lando-3.md).

There are, however, a few different things you can do to improve performance.

[[toc]]

## 1. VirtioFS on macOS

Docker Desktop [4.16.1](https://docs.docker.com/desktop/release-notes/#4161) finally makes VirtioFS file sharing generally available. VirtioFS offers [significant improvements in performance](https://www.jeffgeerling.com/blog/2022/new-docker-mac-virtiofs-file-sync-4x-faster) over the default gRPC FUSE mechanism. It's worth switching to but you will need at least Lando [3.9.0](https://github.com/lando/lando/releases/tag/v3.9.0) for it to work correctly.

If you see errors when using it we recommend the following corrective action:

```bash
rm -rf ~/.lando/scripts
```

## 2. WSL2 on Windows

While you _can_ use Lando on your host Windows machine and have it talk to the Docker Desktop WSL2 backend it's probably _best_ to spin up another Linux distribution like Ubuntu and install Lando there. This avoids most file sharing misery and as you might expect is almost as fast as running on Linux natively.

In this model the user can usually use something like Windows Terminal to directly interface with the WSL2 machine and something like the Visual Studio Code WSL Extension to directly edit their files on the same machine.

To install Lando on your Linux environment in WSL2, follow the appropriate [Linux installation instructions](https://docs.lando.dev/install/linux.html).

## 3. Excluding directories

Users can now `exclude` certain directories from using the default Docker Desktop sharing mechanism. Depending on the amount of files you exclude, this can bring your application from [_ugh fml_ to _pretty close_](https://github.com/lando/lando/issues/1460#issuecomment-467126103) to native speed.

The downside of this approach is that all "excluded" directories are decoupled from your host, meaning that you can no longer edit their contents from your host machine. As a result, we recommend you only exclude directories containing code you don't need to modify such as `vendor` or `node_modules`.

### Configuration

You can exclude directories by adding the top-level `excludes` key to your Landofile and then running a `lando rebuild`.

```yaml
name: my-app
excludes:
  - vendor
  - node_modules
  - modules/contrib
```

You can also exclude an exclude (err I mean include?) with the following syntax. This is useful if you want to exclude a whole bunch of dependencies but still want to hack around on a few. Note that you must wrap the ignore in quotes.

```yaml
name: my-app
excludes:
  - vendor
  - node_modules
  - modules/contrib
  - "!modules/contrib/my-module"
```

::: tip Restart Docker
We've noticed in some instances you need to restart Docker in order to benefit from these performance improvements. If you exclude a decent amount of directories and do not notice a considerable speed increase, we recommend you restart Docker and try again.
:::

#### Caveats

Some of the main caveats you need to be aware of when structuring your excludes are shown below:

##### Rebuild slowness

During each rebuild, Lando will attempt to sync the excluded directories from your host to their analogs inside each container. Depending on how many files you are excluding, this can add significant overhead to rebuilds. Note that on subsequent rebuilds, Lando will only sync new or modified files.

You can mitigate this by installing large directories such as `vendor` as part of a build step.

##### Editing code

If you find yourself needing to edit specific directories or files, we recommend you add them as "exclude excludes" and rebuild your app.

```yaml
name: my-app
excludes:
  - vendor
  - node_modules
  - modules/contrib
  - "!modules/contrib/my-module"
  - "!vendor/dep-i-am-troubleshooting"
```

Alternatively, you can install a text editor like `vim` inside one of your containers and invoke that. This is good if you need to make one-off changes from time to time and don't want to reset your `excludes`.

```yaml
name: my-app
services:
  myservice:
    build_as_root:
      - apt update -y && apt install vim -y
tooling:
  vim:
    service: myservice
```

#### Installing dependencies

Consider the following Landofile.

```yaml
name: my-app
recipe: drupal8
excludes:
  - vendor
services:
  appserver:
    build:
      - composer install
```

This will exclude `vendor` and run `composer install` when you start up your app. After this happens, you should expect to have an empty `vendor` directory on your host but a fully populated one inside each container. Now, imagine you wish, to install an additional dependency:

**Will show up on your host, but not in the container where it needs to be**

```bash
composer require pirog/my-module
```

**Will show up in the container like it needs to, but not on the host**

```bash
lando composer require pirog/my-module
```

The implication here is that *all* operations that manipulate files inside excluded directories need to be run inside the container. Generally, this can be accomplished by running the `lando` variant of a given command such as `lando yarn` instead of `yarn`. Also note that you can exclude exclude new directories and run a `lando rebuild`.

```yaml
name: my-app
recipe: drupal8
excludes:
  - vendor
  - "!vendor/pirog/my-module"
services:
  appserver:
    build:
      - composer install
      - composer require pirog/my-module
```

If you run a `lando rebuild` with the above Landofile, you should expect to see a `vendor` directory containing just the `pirog/my-module` project on your host. You should be able to edit this directory directly from your host and see the changes in your container.

##### Cannot remove mounted directories

All of the directories you exclude cannot be removed with a `rm -rf /path/to/exclude` while inside of your container. You will likely get an error indicating the device is busy. This means if you exclude a directory that gets removed during a dependency update or build step you will likely experience some degree of sadness.

