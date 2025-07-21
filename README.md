# Lando Core

These are the core libraries that power Lando. They are implemented in [`@lando/cli`] and things like [Pantheon LocalDev](https://pantheon.io/product/localdev) and [WordPress VIP CLI](https://github.com/Automattic/vip-cli/blob/develop/package.json).

On a high level they serve as:

**An abstraction layer** Lando vastly reduces the complexity of spinning up containers by exposing only the most relevant config for a given "service" and setting "sane defaults". Lando also provides "recipes" which are common combinations of services and their tooling that satisfy a given development use case - e.g. Drupal, Python, Laravel, Dotnet, etc.

**A superset** Lando provides ways for developers to run complex commands, build steps and automation on their services without the hassle of custom Dockerfiles or long "docker exec" commands. Think `lando yarn add express`. Think clear my applications cache after I import a database. Think install this core-extension before my appserver starts and then `composer install` after it does.

**A utility** Lando handles some of the more arduous configuration required for a good Docker Compose setup - e.g. proxying, nice urls, cross-application networking (think Vue.js frontend talking to a separate Laravel backend), host-container file permission handling, file sharing, per-container SSL certificate handling, ssh-key handling, etc.

## Basic Usage

```js
const Lando = require('@lando/core');
const lando = new Lando(config);

// bootstrap and go
return lando.bootstrap(bsLevel).then(lando => {
  lando.getApp().init().then(() => cli.run(getTasks(config, cli.argv()), config));
});
const
```

For more info you should check out the [docs](https://docs.lando.dev/core/v3):

## Issues, Questions and Support

If you have a question or would like some community support we recommend you [join us on Slack](https://launchpass.com/devwithlando).

If you'd like to report a bug or submit a feature request then please [use the issue queue](https://github.com/lando/core/issues/new/choose) in this repo.

## Changelog

We try to log all changes big and small in both [THE CHANGELOG](https://github.com/lando/core/blob/main/CHANGELOG.md) and the [release notes](https://github.com/lando/core/releases).

## Contributors

<a href="https://github.com/lando/core/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lando/cli" />
</a>

Made with [contributors-img](https://contrib.rocks).`

## Other Selected Resources

* [LICENSE](/LICENSE)
* [TERMS OF USE](https://docs.lando.dev/terms)
* [PRIVACY POLICY](https://docs.lando.dev/privacy)
