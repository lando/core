---
title: Development
description: Learn how to develop and contribute to Lando Core
---

# Development

This guide contains information to help onboard developers to work on Lando Core.

## Requirements

At the very least you will need to have the following installed:

* [Lando 3.21.0+](https://docs.lando.dev/getting-started/installation.html) preferably installed [from source](https://docs.lando.dev/install/source.html).
* [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
* [Node 18](https://nodejs.org/dist/latest-v18.x/)

## Installation

Working on Lando Core requires that you have both the [Lando CLI](https://github.com/lando/cli) and [Lando Core](https://github.com/lando/core) installed [from source](https://docs.lando.dev/install/source.html). You can then symlink (or use `npm link`) to have `@lando/cli` utilize your locally installed source copy of `@lando/core`:


```sh
# Clone this repo
git clone https://github.com/lando/core.git && cd core

# Install deps
npm install

# Symlink @lando/core into your installed @lando/cli
cd ../cli/node_modules/@lando && rm -r core && ln -s ../../../core core
```

## Working

This repo contains various working and tested Lando apps in the [examples](https://github.com/lando/core/tree/main/examples) folder. You should use these or create new ones to help with development.

Note that each one of these examples contains the following section in its Landofile.

```yaml
plugins:
  "@lando/core": ../..
```

This tells Lando that _this_ app should use the source version of `@lando/core` that you cloned down in the installation. This is useful because it allows you to isolate development within this repo without interferring with any other apps using the stable and global version of `@lando/core`.

This means that you should _almost always_ develop against apps in the `examples` folder and that those apps should _always_ contain the above `plugins` config. If you have an extant Lando application you want to develop against you can temporarily tell it to use the cloned down version of `@lando/core` with the same line.

```yaml
plugins:
  "@lando/core": /path/to/plugin
```

Whether you are working off an existing example or a new one you should make sure that you are updating or adding new tests as you go. See [leia testing](#leia-tests) below for more detail.

## Documentation

If you want to help with contributing documentation here are some useful commands once you've cloned and installed the project.

```bash
# launch local docs site
npm run docs:dev

# build docs locally
npm run docs:build

# preview built docs locally
npm run docs:build
```

If you are more interested in the internals of the docs they use [VitePress](https://vitepress.dev/) and our [SPECIAL THEME](https://vitepress-theme-default-plus.lando.dev).

## Testing

It's best to familiarize yourself with how Lando [does testing](https://docs.lando.dev/contrib/coder.html) in general before proceeding.

### Unit Tests

Generally, unit testable code should be placed in `utils` and then the associated test in `tests` in the form `FILE-BEING-TESTED.spec.js`. Here is an example:

```bash
./
|-- utils
    |-- stuff.js
|-- test
    |-- stuff.spec.js
```

And then you can run the tests with the below.

```bash
# Run unit tests
npm run test:unit
```

### Leia Tests

We do end to end testing with our made-just-for-Lando testing framework [Leia](https://github.com/lando/leia). Leia allows us to define tests as a series of commented shell commands in human readable markdown files. Here is a simple example:

```md
Start up tests
--------------

# Should start up successfully
lando start

Verification commands
---------------------

# Should be able to connect to all mariadb relationships
lando mariadb main -e "show tables;"

Destroy tests
-------------

# Should be able to destroy our app
lando destroy -y
```

Note that the headers here are important. The _Start up tests_ header specifies things that should run before the main series of tests. _Verification commands_ is the main body of tests and is required. _Destroy tests_ specifies any needed clean up commands to run.

If you check out the various READMEs in our [examples](https://github.com/lando/core/tree/main/examples) you will notice that they are all Leia tests.

Before running all or some of the tests you will need to generate them.

```bash
# Run ALL the tests, this will likely take a long time
npm run test:leia

# Run the tests for a single example
npx leia examples/mariadb-10.2/README.md -c 'Destroy tests'
```

If you've created new testable examples then you will also need to let GitHub Actions know so they can run on pull requests.

To do that you will either want to add the tests to an existing workflow that makes sense or create a new workflow. If you are creating a new workflow you should just copy an existing one and modify the filename and `name` key to something that makes sense.

To add the new tests to the workflow just modify `jobs.leia-tests.strategy.matrix.leia-tests` with the new tests.

```yaml
jobs:
  leia-tests:
    strategy:
      fail-fast: false
      matrix:
        leia-test:
          - examples/2.1
          - examples/2.2

```

Now open a pull request and the new tests should run!

For a deeper dive on Leia you can go [here](https://github.com/lando/leia).

## Releasing

To deploy and publish a new version of the package to the `npm` registry you need only [create a release on GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository). The GitHub release will automatically [prepare the release](https://github.com/lando/prepare-release-action) and deploy it to NPM, so make sure to use the correct semantic version for the release title (ex: \`v0.8.0\`).

Also note that if you create a "pre-release" it will tag the `npm` package with `edge` instead of the default `latest` tag. Also note that while you can toggle the pre-release checkbox after the initial release creation this will not trigger a new release and/or promote the release from `edge` to `latest`. If you want to deploy to `latest` then create a new release without pre-released checked.

```bash
# Will pull the most recent GitHub release
npm install @lando/core
# Will pull the most recent GitHub pre-release
npm install @lando/core@edge
```

## Contribution

If you want to contribute code then just follow [this flow](https://docs.github.com/en/get-started/using-github/github-flow).
