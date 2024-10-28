---
title: Development
description: Learn how to develop and contribute to the Lando CLI.
---

# Development

This guide contains information to help onboard developers to work on the Lando CLI.

## Requirements

At the very least you will need to have the following installed:

* [Latest Stable Version of Docker](https://docs.docker.com/engine/install/) for your operating system, set to its *factory defaults*.
* [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
* [Node 18](https://nodejs.org/dist/latest-v18.x/)

## Installation

Follow the ["From Source" instructions for installing Lando.](https://docs.lando.dev/install/source.html)

## Working

Any change you make to the `cli` project cloned (and correctly symlinked) to operate as your Lando binary will be reflected when running the `lando` command. In some cases, you may need to run `lando --clear` to have new commands and other changes appear.

## Documentation

If you want to help with contributing documentation here are some useful commands once you've cloned and installed the project.

```sh
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

```sh
./
|-- utils
    |-- stuff.js
|-- test
    |-- stuff.spec.js
```

And then you can run the tests with the below.

```sh
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

If you check out the various READMEs in our [examples](https://github.com/lando/cli/tree/main/examples) you will notice that they are all Leia tests.

Before running all or some of the tests you will need to generate them.

```sh
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
          - examples/v3
          - examples/v4

```

Now open a pull request and the new tests should run!

For a deeper dive on Leia you can go [here](https://github.com/lando/leia).

## Releasing

To deploy and publish a new version of the package to the `npm` registry you need only [create a release on GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository). The GitHub release will automatically [prepare the release](https://github.com/lando/prepare-release-action) and deploy it to NPM, so make sure to use the correct semantic version for the release title (ex: \`v0.8.0\`).

Also note that if you create a "pre-release" it will tag the `npm` package with `edge` instead of the default `latest` tag. Also note that while you can toggle the pre-release checkbox after the initial release creation this will not trigger a new release and/or promote the release from `edge` to `latest`. If you want to deploy to `latest` then create a new release without pre-released checked.

```sh
# Will pull the most recent GitHub release
npm install @lando/cli
# Will pull the most recent GitHub pre-release
npm install @lando/cli@edge
```

## Contribution

If you want to contribute code then just follow [this flow](https://docs.github.com/en/get-started/using-github/github-flow).
