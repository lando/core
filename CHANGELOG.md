## {{ UNRELEASED_VERSION }} - [{{ UNRELEASED_DATE }}]({{ UNRELEASED_LINK }})

## v3.23.0-beta.10 - [October 26, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.10)

### New Features & Improvements

* Added helpful `tip` about using `lando shellenv` when it cannot detect `~/.lando/bin` in `PATH`
* Changed `lando setup` to pull common plugins based on release `channel` to better mimic fatcore
* Improved internet detection tests [#243](https://github.com/lando/core/issues/243)
* Improved `lando shellenv` to produce more consistent newliney output
* Rebased `axios` and `octokit`  on `@npmcli/agent` to improve request consistency across environments
* Updated default Docker Desktop version to `4.34.3`
* Updated default Docker Engine version to `27.3.1`
* Udpated recommended Docker Destkop range to `>=4.34.0`
* Updated tested Docker Desktop range to `<=4.35`
* Updated tested Docker Compose range to `<=2.29.2`

### Fixed

* Fixed failed `healthchecks` from reporting `unknown shorthand flag: 'T' in -T` instead of underlying error (thanks to @AaronFeledy)

### Internal

* Added `debugShim` to `lando.utils`
* Added `downloadX` to `lando.utils`
* Added `getAxios` to `lando.utils`
* Added `getOctokit` to `lando.utils`
* Added `getUserShell` to `lando.utils`
* Added `getUserShellProfile` to `lando.utils`
* Added `isVersionLte` to `lando.utils`
* Added `legacyMerge` to `lando.utils`
* Added `mergeArrays` to `lando.utils`
* Added `mergePromise` to `lando.utils`
* Added `merge` to `lando.utils`
* Added `readFile` to `lando.utils`
* Added `remove` to `lando.utils`
* Added `runCommand` to `lando.utils`
* Added `runElevated` to `lando.utils`
* Added `runPowerShell` to `lando.utils`
* Added `slugify` to `lando.utils`
* Added `writeFile` to `lando.utils`
* Switched `URL.parse` to `url.parse` until people are reliably on a `node20` CLI

## v3.23.0-beta.9 - [October 26, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.9)

### New Features & Improvements

* Added helpful `tip` about using `lando shellenv` when it cannot detect `~/.lando/bin` in `PATH`
* Changed `lando setup` to pull common plugins based on release `channel` to better mimic fatcore
* Improved internet detection tests [#243](https://github.com/lando/core/issues/243)
* Improved `lando shellenv` to produce more consistent newliney output
* Rebased `axios` and `octokit`  on `@npmcli/agent` to improve request consistency across environments
* Updated default Docker Desktop version to `4.34.3`
* Updated default Docker Engine version to `27.3.1`
* Udpated recommended Docker Destkop range to `>=4.34.0`
* Updated tested Docker Desktop range to `<=4.35`
* Updated tested Docker Compose range to `<=2.29.2`

### Fixed

* Fixed failed `healthchecks` from reporting `unknown shorthand flag: 'T' in -T` instead of underlying error (thanks to @AaronFeledy)

### Internal

* Added `debugShim` to `lando.utils`
* Added `downloadX` to `lando.utils`
* Added `getAxios` to `lando.utils`
* Added `getOctokit` to `lando.utils`
* Added `getUserShell` to `lando.utils`
* Added `getUserShellProfile` to `lando.utils`
* Added `isVersionLte` to `lando.utils`
* Added `legacyMerge` to `lando.utils`
* Added `mergeArrays` to `lando.utils`
* Added `mergePromise` to `lando.utils`
* Added `merge` to `lando.utils`
* Added `readFile` to `lando.utils`
* Added `remove` to `lando.utils`
* Added `runCommand` to `lando.utils`
* Added `runElevated` to `lando.utils`
* Added `runPowerShell` to `lando.utils`
* Added `slugify` to `lando.utils`
* Added `writeFile` to `lando.utils`
* Switched `URL.parse` to `url.parse` until people are reliably on a `node20` CLI

## v3.23.0-beta.7 - [October 24, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.7)

* Fixed some packaging problems with new combining `core/cli` and changed so tests run 💯 packaged

## v3.23.0-beta.5 - [October 24, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.5)

### Fixes

* Fixed run-from-source `#shebang` to be more universal
* Fixed `flags: 0x5000: no such file or directory: unknown` on WSL when bind mounting certain files the second time [#242](https://github.com/lando/core/issues/242)
* Fixed bug causing https proxy routes to be assigned when they shouldnt be
* Fixed bug causing cache from repopulating old proxy addresses that have been removed [#209](https://github.com/lando/core/issues/209)
* Fixed bug in `v4` auto `entrypoint` and `command` population
* Fixed regression causing empty tooling `options` to throw an error [#240](https://github.com/lando/core/issues/240)
* Improved merging of same-service, same-hostname-pathname `proxy` routes, fixes [#246](https://github.com/lando/core/issues/246)
* Improved `dns` preference of `ipv4first`

## v3.23.0-beta.4 - [October 22, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.4)

* Updating for release considerations

## v3.23.0-beta.3 - [October 22, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.3)

* Fixed critical bug where `core` was not being loaded when it only exists internally

## v3.23.0-beta.2 - [October 21, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.2)

* Updating for release considerations

## v3.23.0-beta.1 - [October 21, 2024](https://github.com/lando/core/releases/tag/v3.23.0-beta.1)

### New Features

* Updated packaged `cli` to use `node20`

### Fixes

* Fixed bug causing development release versions from incorrectly reporting as updatable
* Fixed bug causing updates to fail when `SHELL` environment variable is not set
* Fixed bug causing error handler error when error code is not an integer

### Internal

* Recombined `@lando/cli` into `@lando/core` eg `lando` binaries are now released here
* Removed version 4 runtime selector

## v3.22.3 - [October 18, 2024](https://github.com/lando/core/releases/tag/v3.22.3)

* Added _maybe-it-works?_ renderer handling for `TERM=dumb`
* Changed and standardized `nonTTY` renderer to/from `simple`
* Improved `LandoCA` support on `archlinux`
* Improved `dc2` renderer error selection on multiline errors
* Improved error messages and fixed typos on Linux build engine setup
* Standardized removey operations and made `remove` more "deletey"

## v3.22.2 - [October 17, 2024](https://github.com/lando/core/releases/tag/v3.22.2)

* Fixed bug causing `lando init` failures when it is the _first_ command run
* Fixed bug clobbering `v3` certificates in some circumstances
* Fixed bug causing `lando plugin-add` to fail in the wrong place when it's passed `encodeURIComponent` encodeys

## v3.22.1 - [October 11, 2024](https://github.com/lando/core/releases/tag/v3.22.1)

* Added explicit CA install support for `linuxmint` and `endeavouros` [#3749](https://github.com/lando/lando/issues/3749) [#223](https://github.com/lando/core/issues/223) [#225](https://github.com/lando/core/issues/225)
* Added fallback method for for installing CA on Linux distros that are based on other supported distros
* Switched `cli` update channel back to `cli` for now

## v3.22.0 - [October 10, 2024](https://github.com/lando/core/releases/tag/v3.22.0)

## New Features

* Added new [`lando exec`](https://docs.lando.dev/cli/exec.html) command
* Added cross platform `host.lando.internal` for container-to-host access
* Added limited auto setup to app start-y events
* Added Install Certificate Authority `setup` task
* Added limit `app` support in `task` functions
* Added `usage`, `examples` and `positionals` support to `task` and `tooling` objects
* Added `LANDO_SERVICE_CERT` and `LANDO_SERVICE_KEY` envvars
* Added `!import` `yaml` tag for future `v4` services things
* Added build context `tmp` directory to house various build assets
* Improved build context generation error handling
* Improved consisteny of `mounty` APIs re `source:` and `target:`
* Improved `working_dir` discover in `v4` services
* Improved CA and cert generation
* Improved tooling, events, etc to honor `&` for proper backgrounding with `--detach`
* Improved `v3` plugin script automoving (finally!)
* Updated default Docker Compose version to `2.29.2`
* Updated default Docker Desktop version to `4.34.0`
* Updated default Docker Engine version to `27.2.0`
* Updated tested Docker Desktop range to `<=4.34`
* Updated tested Docker Compose range to `<=2.29.2`

## Bug Fixes

* Fixed bug causing `EISDIR: illegal operation on a directory` on some mounts [#169](https://github.com/lando/core/pull/169)
* Fixed bug causing `COLUMNS` to be forced to `256` [#1847](https://github.com/lando/core/pull/179)
* Fixed bug causing weird array merging in dynamic override tasks
* Fixed bug causing debug output showing in some errors
* Fixed bug causing compose cache to not properly empty on `destroy`
* Fixed bug causing `docker-engine.run` to double emit errors
* Fixed bug causing `undefined` to show on some user password prompts
* Fixed bug causing Docker Desktop `version` information to not load correctly in some circumstances
* Fixed various `dc2` renderer bugs
* Fixed bug causing new `lando exec` command to incorrectly shell wrap
* Fixed bug causing `compose` directories to bloat indefinitely
* Fixed bug causing `stop` to not `kill` when it can just `kill`
* Fixed `os` not defined during `lando setup` on `linux`
* Fixed inconsistent usage of `skipInstallCa`
* Fixed bug causing autosetup to still `U Need Setup` after installing new orchestrator on `lando start`y events
* Fixed bug preventing non-boot image build hooks from running
* Fixed bug causing hook files to be `COPY`ed to early in Imagefile
* Fixed bug causing `appMount` to be not correctly added as a `git` `safe.directory`
* Fixed bug causing preexisting `urls` in `lando info` to be clobbered by `localhost` port discovery
* Fixed bug causing `allServices` to sometimes be unset in some recipe tasks
* Fixed bug preventing some error codes from bubbling up correctly
* Fixed bug causing race condition when setting non-service scoped `storage` labels
* Fixed bug causing preexisting `urls` in `lando info` to be clobbered by `localhost` port discovery
* Fixed bug causing `allServices` to sometimes be unset in some recipe tasks
* Fixed bug causing build contexts to not wipe correctly between rebuilds
* Fixed bug causing build context directories and compose caches to grow indefinitely over time

## Internal

* Changed `.ps1` scripts to use `-Option` style option convention
* Changed `LANDO_HOST_IP` to now use new `host.lando.internal`
* Improved `run` volume mounting
* Improved `volume` type detection
* Moved Lando Development Certificate Authority creation to `setup` framework
* Moved Landonet 2 upgrade to `setup` framework
* Rebased `yaml` libraries on new `yaml` component
* Rebased `git` history on `lando/cli` for pending MERGE
* Renamed `lash` and `landorc` to `lash.sh` and `landorc.sh` for more consistent naming and packaging
* Removed `_casetup` builder in favor of native CA generation
* Removed `ip` `npm` package
* Updated `@lando/cli` release pointer to `@lando/core` for pending MERGE
* Upgraded `js-yaml` to `^4.1.0`

### DEPRECATIONS

* **DEPRECATED** `lando ssh` in favor of new `lando exec`
* Defunct `lando share` command is now a hidden command

## v3.22.0-beta.7 - [September 5, 2024](https://github.com/lando/core/releases/tag/v3.22.0-beta.7)

## Bug Fixes

* Fixed bug causing preexisting `urls` in `lando info` to be clobbered by `localhost` port discovery
* Fixed bug causing `allServices` to sometimes be unset in some recipe tasks

## v3.22.0-beta.6 - [September 4, 2024](https://github.com/lando/core/releases/tag/v3.22.0-beta.6)

* This release contains only tests and is mostly to keep version sync with the CLI

## v3.22.0-beta.5 - [September 4, 2024](https://github.com/lando/core/releases/tag/v3.22.0-beta.5)

### New Features

* Updated default Docker Compose version to `2.29.2`
* Updated default Docker Desktop version to `4.34.0`
* Updated default Docker Engine version to `27.2.0`
* Updated tested Docker Desktop range to `<=4.34`
* Updated tested Docker Compose range to `<=2.29.2`

### Bug Fixes

* Fixed bug causing autosetup to still `U Need Setup` after installing new orchestrator on `lando start`y events
* Fixed bug preventing non-boot image build hooks from running
* Fixed bug causing hook files to be `COPY`ed to early in Imagefile
* Fixed bug causing `appMount` to be not correctly added as a `git` `safe.directory`

## v3.22.0-beta.4 - [August 30, 2024](https://github.com/lando/core/releases/tag/v3.22.0-beta.4)

## Bug Fixes

* Fixed `os` not defined during `lando setup` on `linux`
* Fixed inconsistent usage of `skipInstallCa`
* Renamed `lash` and `landorc` to `lash.sh` and `landorc.sh` for more consistent naming and packaging

## v3.22.0-beta.3 - [August 1, 2024](https://github.com/lando/core/releases/tag/v3.22.0-beta.3)

* Changed user build script to always run (for now)

## v3.22.0-beta.2 - [July 30, 2024](https://github.com/lando/core/releases/tag/v3.22.0-beta.2)

### Bug Fixes

* Fixed bug causing new `lando exec` command to incorrectly shell wrap
* Fixed bug causing `compose` directories to bloat indefinitely
* Fixed bug causing `stop` to not `kill` when it can just `kill`

## Internal

* Improved `run` volume mounting
* Improved `volume` type detection

## v3.22.0-beta.1 - [July 25, 2024](https://github.com/lando/core/releases/tag/v3.22.0-beta.1)

### New Features

* Added new [`lando exec`](https://docs.lando.dev/cli/exec.html) command
* Added cross platform `host.lando.internal` for container-to-host access
* Added limited auto setup to app start-y events
* Added Install Certificate Authority `setup` task
* Added limit `app` support in `task` functions
* Added `usage`, `examples` and `positionals` support to `task` and `tooling` objects
* Added `LANDO_SERVICE_CERT` and `LANDO_SERVICE_KEY` envvars
* Improved CA and cert generation
* Improved tooling, events, etc to honor `&` for proper backgrounding with `--detach`
* Improved `v3` plugin script automoving (finally!)
* Updated default Docker Compose version to `2.27.1`
* Updated default Docker Desktop for macOS version to `4.32.0`
* Updated default Docker Desktop for Windows version to `4.32.0`
* Updated default Docker Engine version to `27.0.3`
* Updated tested Docker Desktop range to `<=4.32`

### Bug Fixes

* Fixed bug causing `EISDIR: illegal operation on a directory` on some mounts [#169](https://github.com/lando/core/pull/169)
* Fixed bug causing `COLUMNS` to be forced to `256` [#1847](https://github.com/lando/core/pull/179)
* Fixed bug causing weird array merging in dynamic override tasks
* Fixed bug causing debug output showing in some errors
* Fixed bug causing compose cache to not properly empty on `destroy`
* Fixed bug causing `docker-engine.run` to double emit errors
* Fixed bug causing `undefined` to show on some user password prompts
* Fixed bug causing Docker Desktop `version` information to not load correctly in some circumstances
* Fixed various `dc2` renderer bugs

### DEPRECATIONS

* **DEPRECATED** `lando ssh` in favor of new `lando exec`
* Defunct `lando share` command is now a hidden command

### Internal

* Changed `.ps1` scripts to use `-Option` style option convention
* Changed `LANDO_HOST_IP` to now use new `host.lando.internal`
* Moved Lando Development Certificate Authority creation to `setup` framework
* Moved Landonet 2 upgrade to `setup` framework
* Removed `_casetup` builder in favor of native CA generation
* Removed `ip` `npm` package

## v3.21.2 - [June 20, 2024](https://github.com/lando/core/releases/tag/v3.21.2)

### Bug Fixes

* Fixed bug causing legacy `meUser` auto detection to fail in some situation for new Lando 4 service [#178](https://github.com/lando/core/pull/178)

## v3.21.1 - [June 19, 2024](https://github.com/lando/core/releases/tag/v3.21.1)

### Bug Fixes

* Fixed issue with importing databases to a service with the "default" `database` named database. [lando/mysql#53](https://github.com/lando/mysql/issues/53)

## v3.21.0 - [May 25, 2024](https://github.com/lando/core/releases/tag/v3.21.0)

### New Features

* Added ability to autostart Docker Desktop for Windows from within WSL instances [#164](https://github.com/lando/core/pull/164)
* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Added new _very low level_ generic [L337 Service](https://docs.lando.dev/core/v3/services/l337.html)
* Improved `healthcheck` so it can now be disabled with `healthcheck: false`
* Improved method for locating and starting Docker Desktop on Windows [#164](https://github.com/lando/core/pull/164)
* Improved `lando version` to give more total version information
* Introduced "Untested Docker Version" notice
* Improved `sudo` user detection on Linux
* Improved Docker compatibility messages
* Improved `wsl` status detection
* Improved `spawn` debugging output
* Updated default Docker Compose version to `2.27.0`
* Updated default Docker Desktop version to `4.30.0`
* Updated default Docker Engine version to `26.1.1`
* Updated tested Docker Desktop range to `<=4.30`
* Updated tested Docker Engine range to `<27`
* Updated `sql-export.sh` to use `mariadb-dump` command (if available). [#148](https://github.com/lando/core/pull/148)

### Fixes

* Added general purpose error `trap` to Docker Desktop install script on Windows, maybe fixes [#118](https://github.com/lando/core/issues/118)
* Fixed bug that prevented password prompts from rendering
* Fixed inescapable password prompt when starting aborting a lando start
* Fixed prompt showing in `non-interactive` environments
* Fixed errors caused by "legacy" plugins [#127](https://github.com/lando/core/issues/127)
* Fixed `warnings is not defined` error when trying to bring up `proxy`
* Fixed Docker Engine autostart for users using `service` instead of `systemctl` [#110](https://github.com/lando/core/issues/110)
* Fixed `once` events running more than `once`
* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed CLI update issues on Windows [#109](https://github.com/lando/core/issues/109) [#122](https://github.com/lando/core/issues/122)
* Fixed encoding error in default `write-file`
* Fixed bug that caused Lando to be too impatient when starting Docker Desktop [#164](https://github.com/lando/core/pull/164)
* Fixed unclear error when cancelling certain prompts
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Fixed bug causing `healthy` info to not persist correctly
* Fixed bug causing proxy `502 Bad Gateway` when assiging duplicate `urls` with different `ports`
* Fixed inconsistent container shutdown by switching from `kill` to `stop`
* Fixed inconsistent error display in `dc2` `listr` renderer
* Fixed `Could not find suitable download url` CLI update error caused by a release posted before assets are available
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message
* Improved `MINMAX UID/GID` assignment to reduce exporting layers weirdness

### Internal

* Added `buildkit` as an alias for `buildx` in `l337` service `image` key
* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Bumped minimum `node` version to `18`
* Changed `download-x` to prefer `ipv4` [#165](https://github.com/lando/core/pull/165)
* Changed `lando.log` and `app.log` to be more like `debug`
* Changed `rebuild` to `kill` instead of `stop`
* Improved error handling on `download-x` [#165](https://github.com/lando/core/pull/165)
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Removed `github` dependency
* Removed `mkdirp` dependency
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.21.0-beta.20 - [May 9, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.20)

### New Features

* Improved `sql-import.sh` to drop and recreate `mysql` and `mariadb` tables before importing

### Bug Fixes

* Fixed updating bug caused by improperly named `v3.21.0-beta18` `@lando/cli` release

## v3.21.0-beta.19 - [May 9, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.19)

### New Features

* Added ability to autostart Docker Desktop for Windows from within WSL instances [#164](https://github.com/lando/core/pull/164)
* Improved method for locating and starting Docker Desktop on Windows [#164](https://github.com/lando/core/pull/164)
* Updated default Docker Compose version to `2.27.0`
* Updated default Docker Desktop version to `4.30.0`
* Updated default Docker Engine version to `26.1.1`
* Updated tested Docker Desktop range to `<=4.30`
* Updated tested Docker Engine range to `<27`
* Updated `sql-export.sh` to use `mariadb-dump` command (if available). [#148](https://github.com/lando/core/pull/148)

### Bug Fixes

* Fixed bug that caused Lando to be too impatient when starting Docker Desktop [#164](https://github.com/lando/core/pull/164)
* Fixed unclear error when cancelling certain prompts

### Internal

* Added `buildkit` as an alias for `buildx` in `l337` service `image` key
* Changed `download-x` to prefer `ipv4` [#165](https://github.com/lando/core/pull/165)
* Changed `rebuild` to `kill` instead of `stop`
* Improved error handling on `download-x` [#165](https://github.com/lando/core/pull/165)

## v3.21.0-beta.18 - [April 29, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.18)

* Fixed bug that prevented password prompts from rendering
* Fixed inescapable password prompt when starting aborting a lando start
* Improved `MINMAX UID/GID` assignment to reduce exporting layers weirdness

## v3.21.0-beta.17 - [April 23, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.17)

* Fixed some stuff in nascent `LandoService4` for demoing puroses

## v3.21.0-beta.16 - [April 23, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.16)

* Added dumb `linux` `ssh-agent` support for nascent `LandoService4`

## v3.21.0-beta.15 - [April 20, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.15)

### Notes

* Users can now try out the lowest level and first `api: 4` service. [Read more](https://docs.lando.dev/core/v3/services/l337.html)

### New Features

* Added `buildx` toggle to `l337` service `image` key
* Added build `args` support to `l337` service `image` key
* Added `ssh` support to `l337` service `image` key
* Changed default `l337` service builder to `buildx`
* Improved `api: 4` image build errors and handling

### Bug Fixes

* Fixed bug causing `healthy` info to not persist correctly
* Fixed bug causing proxy `502 Bad Gateway` when assiging duplicate `urls` with different `ports`
* Fixed inconsistent container shutdown by switching from `kill` to `stop`
* Fixed inconsistent error display in `dc2` `listr` renderer

### Internal

* Changed default `healthy` info from `true` to `unknown`
* Changed `api: 4` service info to provide a `state` key
* Added `app.updateComposeCache()` and `app.v4.updateComposeCache` for better metadata consistencu

## v3.21.0-beta.14 - [April 10, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.14)

### New Features

* Added better messages on when and how to update Docker components
* Updated default Docker Compose version to `2.26.1`
* Updated default Docker Desktop version to `4.29.0`
* Updated default Docker Engine version to `26.0.0`
* Updated tested Docker Desktop range to `<=4.29`
* Updated tested Docker Engine range to `<27`

### Bug Fixes

* Fixed bug where `lando update` check failures were failing silently
* Fixed bug where `GITHUB_TOKEN` was being used, if set, to get `lando update` info

### Internal

* Changed `lando update` GitHub `@octokit/rest` auth to use `LANDO_GITHUB_TOKEN` instead of `GITHUB_TOKEN`

## v3.21.0-beta.13 - [April 6, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.13)

### New Features

* Improved `healthcheck` so it can now be disabled with `healthcheck: false`

## v3.21.0-beta.12 - [March 25, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.12)

* This release has no content and exists so we can switch over to [@lando/setup-lando](https://github.com/lando/setup-lando) for POSIX install

## v3.21.0-beta.11 - [March 18, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.11)

### Fixes

* Fixed `lando shellenv` to remove duplicate `PATH` entries

## v3.21.0-beta.10 - [March 15, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.10)

### New Features

* Introduced "Untested Docker Version" notice
* Improved `sudo` user detection on Linux
* Improved Docker compatibility messages
* Improved `wsl` status detection
* Improved `spawn` debugging output
* Updated default Docker Compose version to `2.24.6`
* Updated default Docker Desktop version to `4.28.0`
* Updated supported Docker Desktop range to `>=4.0.0 <5`
* Updated supported Docker Engine range to `<26`

### Fixes

* Fixed `--debug` causing `lando setup -y` to hang in GitHub Actions `windows` runners
* Fixed errors caused by "legacy" plugins [#127](https://github.com/lando/core/issues/127)
* Fixed `lando setup` incorrectly reporting double the plugin installed total
* Fixed `once` events running more than `once`
* Fixed prompt showing in `non-interactive` environments
* Updated `lando-experimental` to new plugin format

## v3.21.0-beta.9 - [March 10, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.9)

### New Features

* Improved `lando shellenv` to work on Windows shells like `powershell.exe`, `cmd.exe` and `bash.exe`

### Fixes

* Fixed CLI update issues on Windows [#109](https://github.com/lando/core/issues/109) [#122](https://github.com/lando/core/issues/122)
* Fixed encoding error in default `write-file`

## DevOps

* Switched `leia` tests to run against `3-dev-slim` for now

### Internal

* Changed `lando update` to download CLI binaries to the Lando 4 `cacheDir`
* Improved `download-x` to auto create nonexistent paths as needed

## v3.21.0-beta.8 - [March 5, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.8)

* This release has no content it exists to provide version syncing with `@lando/cli`

## v3.21.0-beta.7 - [March 1, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.7)

### Fixes

* Added general purpose error `trap` to Docker Desktop install script on Windows, maybe fixes [#118](https://github.com/lando/core/issues/118)
* Changed `lando shellenv` to print to `stderr` when it has no shellenv to print
* Fixed issue with `wsl.exe` throwing an error when not found [#117](https://github.com/lando/core/issues/117)
* Fixed issue with `is-group-member` throwing an when target group was nonexistent [#116](https://github.com/lando/core/issues/116)

### Internal

* Improved `is-group-member` so it does not require the existence of the target group
* Improved `run-command`, `run-elevated` and `run-powershell-script` so they correctly handle pre-command executing errors eg `ENOENT`

## v3.21.0-beta.6 - [February 28, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.6)

### Fixes

* Improved `lando shellenv` so it prints a message if your environment is already g2g

### Internal

* Improved `get-shellenv-paths` to filter nonexistent paths

## v3.21.0-beta.5 - [February 26, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.5)

### New Features

* Added support for `slim` CLI updates

### Fixes

* Fixed `Cannot write to ...` CLI update isseus on Linux and macOS [#109](https://github.com/lando/core/issues/109) [#122](https://github.com/lando/core/issues/122)

## v3.21.0-beta.4 - [February 22, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.4)

### Fixes

* Fixed Docker Engine autostart for users using `service` instead of `systemctl` [#110](https://github.com/lando/core/issues/110)
* Reverted to older `moveConfig` that i guess silently failed in a good way by @pirog in https://github.com/lando/core/pull/115

### New Contributors

* @soleneggd made their first contribution in https://github.com/lando/core/pull/113

## v3.21.0-beta.3 - [February 21, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.3)

### Fixes

* Fixed `warnings is not defined` error when trying to bring up `proxy`
* Fixed nested plugins eg `@lando/healthcheck` not showing correct update status
* Fixed incorrect count showing on `lando plugin-add`
* Fixed Docker Engine autostart for users using `service` instead of `systemctl` [#110](https://github.com/lando/core/issues/110)

## v3.21.0-beta.2 - [February 20, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.2)

### New Features

* Updated default Docker Compose version to `2.24.5`
* Updated default Docker Desktop version to `4.27.2`
* Updated default Docker Engine version to `25.0.3`
* Updated supported Docker Desktop range to `<4.28`
* Updated supported Docker Engine range to `<26`

### Fixes

* Fixed `Enquirer is a peer dependency that must be installed separately` showing up on `lando setup` [#105](https://github.com/lando/core/issues/105)
* Improved dependency version compatibility check to be [more forgiving](https://www.youtube.com/watch?v=1DxFDK8kmPY) [#104](https://github.com/lando/core/issues/104)

### Internal

* Changed default `api: 4` service from `l337` to `lando`
* Renamed `v4.orchestratorVersion` to `v4.composeApi`

## v3.21.0-beta.1 - [February 16, 2024](https://github.com/lando/core/releases/tag/v3.21.0-beta.1)

* This release has no content, it exists to move forward our versioning.

## v3.21.0-alpha.10 - [January 3, 2024](https://github.com/lando/core/releases/tag/v3.21.0-alpha.10)

* Removed dangling reference to utils.appMachineName to fix init issue.

## v3.21.0-alpha.9 - [December 12, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.9)

### Internal

* Removed `copy-dir` in attempt to simplify/minimize/reduce dependencies
* Removed lingering `db-tools` tests which should happen in implementating plugins now

## v3.21.0-alpha.8 - [December 7, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.8)

* This release has no content, it exists to test new `lando update` flows

## v3.21.0-alpha.7 - [December 5, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.7)

### **DANGER NOTES**

This is an `alpha` release which means:

* Definitely don't try it out unless you are into [risky business](https://www.youtube.com/watch?v=G2UVsyVLLcE)
* It is "feature complete" but has very little automated testing so we cannot guarantee any level of "it works" beyond "it works on our machines" ;)
* Subsequent releases could be breaking, _very breaking_

So, basically, if you have real work you need to do we recommend you [don't try it](https://www.youtube.com/watch?v=7Ood-IE7sx4)!

### New Features

* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Improved `lando version` to give more total version information

### Fixes

* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message
* Improved `LANDO_DEBUG` to also throw a stack trace

### Internal

* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Changed `lando.log` and `app.log` to be more like `debug`
* Bumped minimum `node` version to `18`
* Bumped supported Docker Desktop version to `>4 <4.27`
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`
* Removed `bundledDependencies` from `package.json`, now handled by `@lando/prepare-release-action@v3`
* Removed `dayjs` dependency
* Removed `github` dependency
* Removed `mkdirp` dependency

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.21.0-alpha.6 - [December 5, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.6)

> This will begin to set things right

### New Features

* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Improved `lando version` to give more total version information

### Fixes

* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message

### Internal

* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Changed `lando.log` and `app.log` to be more like `debug`
* Bumped minimum `node` version to `18`
* Bumped supported Docker Desktop version to `>4 <4.27`
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`
* Removed `bundledDependencies` from `package.json`, now handled by `@lando/prepare-release-action@v3`
* Removed `dayjs` dependency
* Removed `github` dependency
* Removed `mkdirp` dependency

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.21.0-alpha.5 - [December 5, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.5)

> This will begin to set things right

### New Features

* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Improved `lando version` to give more total version information

### Fixes

* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message

### Internal

* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Changed `lando.log` and `app.log` to be more like `debug`
* Bumped minimum `node` version to `18`
* Bumped supported Docker Desktop version to `>4 <4.27`
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`
* Removed `bundledDependencies` from `package.json`, now handled by `@lando/prepare-release-action@v3`
* Removed `dayjs` dependency
* Removed `github` dependency
* Removed `mkdirp` dependency

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.21.0-alpha.4 - [December 5, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.4)

> This will begin to set things right

### New Features

* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Improved `lando version` to give more total version information

### Fixes

* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message

### Internal

* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Changed `lando.log` and `app.log` to be more like `debug`
* Bumped minimum `node` version to `18`
* Bumped supported Docker Desktop version to `>4 <4.27`
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`
* Removed `bundledDependencies` from `package.json`, now handled by `@lando/prepare-release-action@v3`
* Removed `dayjs` dependency
* Removed `github` dependency
* Removed `mkdirp` dependency

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.21.0-alpha.3 - [December 4, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.3)

> This will begin to set things right

### New Features

* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Improved `lando version` to give more total version information

### Fixes

* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message

### Internal

* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Changed `lando.log` and `app.log` to be more like `debug`
* Bumped minimum `node` version to `18`
* Bumped supported Docker Desktop version to `>4 <4.27`
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`
* Removed `bundledDependencies` from `package.json`, now handled by `@lando/prepare-release-action@v3`
* Removed `dayjs` dependency
* Removed `github` dependency
* Removed `mkdirp` dependency

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.21.0-alpha.2 - [December 4, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.2)

> This will begin to set things right

### New Features

* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Improved `lando version` to give more total version information

### Fixes

* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message

### Internal

* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Bumped minimum `node` version to `18`
* Bumped supported Docker Desktop version to `>4 <4.26`
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`
* Removed `github` dependency
* Removed `mkdirp` dependency

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.21.0-alpha.1 - [December 4, 2023](https://github.com/lando/core/releases/tag/v3.21.0-alpha.1)

> This will begin to set things right

### New Features

* Added `autostart` Docker Engine support to Linux
* Added `lando update` command so Lando and installed plugins can self-update
* Added hidden `lando setup` command to replace package installers
* Added hidden `lando plugin-add` command to install external plugins
* Added hidden `lando plugin-remove` command to remove external plugins
* Improved `lando version` to give more total version information

### Fixes

* Fixed broken Docker Compose|Desktop|Engine links
* Fixed bug causing `lando` services to report `Up` when they actually `Exited` non-zero
* Fixed longstanding bug causing some debug output to print to `stdout` instead of `stderr`
* Improved post-start status message granularity, they can one of `tip|info|warn|error` now
* Improved post-start status message accessibility
* Improved "Update Available" warning to be less **INTENSE**, is now a post-start info message

### Internal

* Added `app.addMessage` for more granular and accessible post-start app status reporting
* Bumped minimum `node` version to `18`
* Bumped supported Docker Desktop version to `>4 <4.26`
* Removed lingering and dangling should-now-be-in-plugins code eg `_drupaly.js`
* Reorganized core to be more like `@lando/core-next` (eg Lando 4)
* Switched (fully, finally) from `github` to `@octokit/rest`
* Switched plugin package manager to `npm`
* Removed `github` dependency
* Removed `mkdirp` dependency

### DEPRECATIONS

* DEPRECATED `app.addWarning` in favor of `app.addMessage`

## v3.20.4 - [October 6, 2023](https://github.com/lando/core/releases/tag/v3.20.4)

### Fixes

* Fixed borked path leading to `Cannot find module './laemp.js'`

## v3.20.3 - [October 6, 2023](https://github.com/lando/core/releases/tag/v3.20.3)

### Fixes

* Fixed `Inappropriate ioctl for device` errors for interactive build steps and events when using `docker-compose` 2 [#70](https://github.com/lando/core/issues/70)
* Fixed race condition in some init `sources` causing command to run before user was properly setup
* Fixed `docker-compose` continually autodownloading on Windows [#67](https://github.com/lando/core/issues/67)

### Internal

* Added `inits` directory to list of plugin autoloaders
* Added `none` recipe for testing purposes
* Moved `_lamp` and `_drupaly` recipes into `builders` folder
* Set `inits` directory as the preferred `init` source
* Switched `github` init `source` to use `@octokit/rest`

## v3.20.2 - [September 30, 2023](https://github.com/lando/core/releases/tag/v3.20.2)

### Fixes

* Fixed regression which broke disabling `tooling` commands [#62](https://github.com/lando/core/issues/62)
* Improved `docker-compose` auto-download so it is more transparent [#63](https://github.com/lando/core/issues/63)
* Improved `docker-compose` download verification [#63](https://github.com/lando/core/issues/63)

## v3.20.1 - [September 27, 2023](https://github.com/lando/core/releases/tag/v3.20.1)

### Fixes

* Fixed bug where `tooling` commands using `app` bootstrap would use `/` instead of `appMount`

## v3.20.0 - [September 22, 2023](https://github.com/lando/core/releases/tag/v3.20.0)

### New Features

* Added support for Docker Compose V2 which is now the default orchestrator. [Read more](https://docs.lando.dev/core/v3/orchestrator.html).
* Added an `orchestratorVersion` option to the global config. [Read more](https://docs.lando.dev/core/v3/orchestrator.html).
* Added `healthcheck` support to all Lando 3 services. [Read more](https://docs.lando.dev/core/v3/healthcheck.html).
* Added a generic Lando 3 `lando` service into core. See [Read more](https://docs.lando.dev/core/v3/lando-service.html).
* Bumped support of Docker Compose to `1.x.x || 2.x.x`
* Bumped support of Docker Desktop to `>=4.0.0 <4.24`
* Bumped support of Docker Engine to `>=18 <25`
* Dropped support for Docker Desktop `<4.0.0`

### Fixes

* Fixed bug where `lando ssh --help` was incorrectly listing `appserver` as the default `service` in some situations
* Fixed bug where `cli` was needlessly printing `usermod: no changes` [#152](https://github.com/lando/cli/pull/152)
* Fixed bug where dynamic tooling events were not setting the service with an option correctly
* Fixed bug where `proxy` service was wiping out `app.compose`
* Fixed deprecated usage of `network.external.name` on `lando_proxyedge`

### Internal

* `config.yml` from `@lando/core` is now loaded after the `config.yml` from `@lando/cli`


### Global Config

  * `composeBin` is now discouraged in favor of `orchestratorVersion`. [Read more](https://docs.lando.dev/core/v3/orchestrator.html).
  * `max` and `min` in `dockerSupportedVersions` are now discouraged in favor of `satisfies`. [See example](https://github.com/lando/core/blob/main/config.yml).

## v3.17.2 - [June 20, 2023](https://github.com/lando/core/releases/tag/v3.17.2)

* Fixed busted cutover to new release process take 2

## v3.17.1 - [June 20, 2023](https://github.com/lando/core/releases/tag/v3.17.1)

* Fixed busted cutover to new release process

## v3.17.0 - [June 20, 2023](https://github.com/lando/core/releases/tag/v3.17.0)

* Added `~/.lando/bin` as preferred install location for Docker Compose
* Switched release flow over to [@lando/prepare-release-action](https://github.com/lando/prepare-release-action)
* Docker Compose `1.29.2` will now be automatically installed to `~/.lando/bin` if a suitable version is not detected, this is to prepare for Docker Compose V1 being removed from Docker Desktop

## v3.16.2 - [June 5, 2023](https://github.com/lando/core/releases/tag/v3.16.2)

* Fixed bug causing key sanitization to mutate the underlying data

## v3.16.1 - [May 25, 2023](https://github.com/lando/core/releases/tag/v3.16.1)

* Added metadata required for `@lando/core` to be pass plugin validation

## v3.16.0 - [May 11, 2023](https://github.com/lando/core/releases/tag/v3.16.0)

* Added default `okCodes` to the scanner to allow `3xx` and `404` [#39](https://github.com/lando/core/pull/39).

## v3.15.0 - [April 7, 2023](https://github.com/lando/core/releases/tag/v3.15.0)

* Added `maxRedirects` as a configurable option of the new `scanner`
* Reverted new url `scanner` to not follow redirects by default, this is more aligned with the behavior of the older `scanner`. [READ MORE](https://docs.lando.dev/core/v3/scanner.html)

## v3.14.0 - [March 1, 2023](https://github.com/lando/core/releases/tag/v3.14.0)

* Added new and improved URL `scanner` provides real time feedback on service status. [READ MORE](https://docs.lando.dev/core/v3/scanner.html)
* Improved `scanner` reliability by preferring IPv4 [#21](https://github.com/lando/core/issues/21)

## v3.11.0 - [February 26, 2023](https://github.com/lando/core/releases/tag/v3.11.0)

* Added detection of MySQL 8 DBs for `laemp` recipes to insert appropriate config [lando/lando#1426](https://github.com/lando/lando/issues/1462)

## v3.10.0 - [January 23, 2023](https://github.com/lando/core/releases/tag/v3.10.0)

* Bumped version just to indicate push to stable

## v3.8.5 - [January 20, 2023](https://github.com/lando/core/releases/tag/v3.8.5)

* Added support for "sandboxed" v3 plugins in anticipation of plugin hybridization
* Fixed bug causing loading of non V3 plugins on Windows [#27](https://github.com/lando/core/issues/27)

## v3.8.4 - [January 18, 2023](https://github.com/lando/core/releases/tag/v3.8.4)

* Added workaround to help with `VirtioFS` support in Docker Desktop `4.16.1`
* Bumped supported Docker Desktop version to `4.16.99`

## v3.8.3 - [January 13, 2023](https://github.com/lando/core/releases/tag/v3.8.3)

* Fixed bug causing `null` `lando.versions` to fatally error

## v3.8.2 - [December 11, 2022](https://github.com/lando/core/releases/tag/v3.8.2)

* Needed fixes to power a deteched `@lando/core`

## v3.8.1 - [December 11, 2022](https://github.com/lando/core/releases/tag/v3.8.1)

* [Ejected the core](https://www.youtube.com/watch?v=BhQ59YzEdUY)
* Removed `lando-alliance` core plugin

## v3.8.0 - [December 10, 2022](https://github.com/lando/core/releases/tag/v3.8.0)

* Core ejected

## v3.7.0 - [December 6, 2022](https://github.com/lando/core/releases/tag/v3.7.0)

* Tagging a release for docs and prepping for decoupling

## v3.6.5 - [December 2, 2022](https://github.com/lando/core/releases/tag/v3.6.5)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Core

* Redid the package and release flow.

### Plugins

* Updated to `@lando/acquia` version [`0.5.2`](https://github.com/lando/acquia/releases/tag/v0.5.2)
* Updated to `@lando/backdrop` version [`0.5.1`](https://github.com/lando/backdrop/releases/tag/v0.5.1)
* Updated to `@lando/dotnet` version [`0.5.1`](https://github.com/lando/dotnet/releases/tag/v0.5.1)
* Updated to `@lando/go` version [`0.5.1`](https://github.com/lando/go/releases/tag/v0.5.1)
* Updated to `@lando/lagoon` version [`0.5.3`](https://github.com/lando/lagoon/releases/tag/v0.5.3)
* Updated to `@lando/mssql` version [`0.5.1`](https://github.com/lando/mssql/releases/tag/v0.5.1)
* Updated to `@lando/mysql` version [`0.5.1`](https://github.com/lando/mysql/releases/tag/v0.5.1)
* Updated to `@lando/node` version [`0.5.1`](https://github.com/lando/node/releases/tag/v0.5.1)
* Updated to `@lando/pantheon` version [`0.5.9`](https://github.com/lando/pantheon/releases/tag/v0.5.9)
* Updated to `@lando/php` version [`0.5.4`](https://github.com/lando/php/releases/tag/v0.5.4)
* Updated to `@lando/python` version [`0.5.1`](https://github.com/lando/python/releases/tag/v0.5.1)
* Updated to `@lando/ruby` version [`0.5.1`](https://github.com/lando/ruby/releases/tag/v0.5.1)

## v3.6.4 - [April 19, 2022](https://github.com/lando/cli/releases/tag/v3.6.4)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Plugins

* Updated to `@lando/php` version [`0.5.3`](https://github.com/lando/php/releases/tag/v0.5.3)

## v3.6.3 - [April 13, 2022](https://github.com/lando/cli/releases/tag/v3.6.3)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Core

* Add/more logging [PR #69](https://github.com/lando/cli/pull/69)
* Provide some VERY basic validation around official lando plugins [PR #131](https://github.com/lando/cli/pull/131)
* More petty codespell corrections and other doc changes

### Plugins

* Updated to `@lando/drupal` version [`0.5.3`](https://github.com/lando/drupal/releases/tag/v0.5.3)
* Updated to `@lando/laravel` version [`0.5.2`](https://github.com/lando/laravel/releases/tag/v0.5.2)
* Updated to `@lando/pantheon` version [`0.5.8`](https://github.com/lando/pantheon/releases/tag/v0.5.8)
* Updated to `@lando/php` version [`0.5.2`](https://github.com/lando/php/releases/tag/v0.5.2)

## v3.6.2 - [February 2, 2022](https://github.com/lando/cli/releases/tag/v3.6.2)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Plugins

* Updated to `@lando/drupal` version [`0.5.1`](https://github.com/lando/drupal/releases/tag/v0.5.1)
* Updated to `@lando/mean` version [`0.5.1`](https://github.com/lando/mean/releases/tag/v0.5.1)
* Updated to `@lando/pantheon` version [`0.5.6`](https://github.com/lando/pantheon/releases/tag/v0.5.6)
* Updated to `@lando/php` version [`0.5.1`](https://github.com/lando/php/releases/tag/v0.5.1)

## v3.6.1 - [January 12, 2022](https://github.com/lando/cli/releases/tag/v3.6.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Core

* Add in imagemagick, apcu, and oauth support for `php:8.0` and `php:8.1` [PR #53](https://github.com/lando/cli/pull/53)
* Update Drupal 9 recipe to PHP 8.0 [PR #84](https://github.com/lando/cli/pull/84)
* Update backdrop default php to 7.4 [PR #86](https://github.com/lando/cli/pull/86)
* Spun out Apache service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Compose service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Dontnet service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Elasticsearch service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Go service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out MailHog service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out MariaDB service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Memcached service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out MongoDB service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out MSSQL service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out MySQL service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out NGINX service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Node service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out PHP service plugin [#3249](https://github.com/lando/lando/issues/3249)
* Spun out PHPMyAdmin service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Postgres service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Python service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Redis service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Ruby service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Solr service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Tomcat service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Varnish service plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Backdrop recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Drupal recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Joomla recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out LAMP recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Laravel recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out LEMP recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out MEAN recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out Symfony recipe plugin [#3259](https://github.com/lando/lando/issues/3259)
* Spun out WordPress recipe plugin [#3259](https://github.com/lando/lando/issues/3259)

### Plugins

* Added `@lando/apache` version [`0.5.0`](https://github.com/lando/apache/releases/tag/v0.5.0)
* Added `@lando/compose` version [`0.5.0`](https://github.com/lando/compose/releases/tag/v0.5.0)
* Added `@lando/dotnet` version [`0.5.0`](https://github.com/lando/dotnet/releases/tag/v0.5.0)
* Added `@lando/elasticsearch` version [`0.5.1`](https://github.com/lando/elasticsearch/releases/tag/v0.5.1)
* Added `@lando/go` version [`0.5.0`](https://github.com/lando/go/releases/tag/v0.5.0)
* Added `@lando/mailhog` version [`0.5.0`](https://github.com/lando/mailhog/releases/tag/v0.5.0)
* Added `@lando/mariadb` version [`0.5.1`](https://github.com/lando/mariadb/releases/tag/v0.5.1)
* Added `@lando/memcached` version [`0.5.0`](https://github.com/lando/memcached/releases/tag/v0.5.0)
* Added `@lando/mongo` version [`0.5.0`](https://github.com/lando/mongo/releases/tag/v0.5.0)
* Added `@lando/mssql` version [`0.5.0`](https://github.com/lando/mssql/releases/tag/v0.5.0)
* Added `@lando/mysql` version [`0.5.0`](https://github.com/lando/mysql/releases/tag/v0.5.0)
* Added `@lando/nginx` version [`0.5.0`](https://github.com/lando/nginx/releases/tag/v0.5.0)
* Added `@lando/node` version [`0.5.0`](https://github.com/lando/node/releases/tag/v0.5.0)
* Added `@lando/php` version [`0.5.0`](https://github.com/lando/php/releases/tag/v0.5.0)
* Added `@lando/phpmyadmin` version [`0.5.0`](https://github.com/lando/phpmyadmin/releases/tag/v0.5.0)
* Added `@lando/postgres` version [`0.5.0`](https://github.com/lando/postgres/releases/tag/v0.5.0)
* Added `@lando/python` version [`0.5.0`](https://github.com/lando/python/releases/tag/v0.5.0)
* Added `@lando/redis` version [`0.5.0`](https://github.com/lando/redis/releases/tag/v0.5.0)
* Added `@lando/ruby` version [`0.5.0`](https://github.com/lando/ruby/releases/tag/v0.5.0)
* Added `@lando/solr` version [`0.5.0`](https://github.com/lando/solr/releases/tag/v0.5.0)
* Added `@lando/tomcat` version [`0.5.0`](https://github.com/lando/tomcat/releases/tag/v0.5.0)
* Added `@lando/varnish` version [`0.5.0`](https://github.com/lando/varnish/releases/tag/v0.5.0)
* Added `@lando/backdrop` version [`0.5.0`](https://github.com/lando/backdrop/releases/tag/v0.5.0)
* Added `@lando/drupal` version [`0.5.0`](https://github.com/lando/drupal/releases/tag/v0.5.0)
* Added `@lando/joomla` version [`0.5.0`](https://github.com/lando/joomla/releases/tag/v0.5.0)
* Added `@lando/lamp` version [`0.5.1`](https://github.com/lando/lamp/releases/tag/v0.5.1)
* Added `@lando/laravel` version [`0.5.1`](https://github.com/lando/laravel/releases/tag/v0.5.1)
* Added `@lando/lemp` version [`0.5.1`](https://github.com/lando/lemp/releases/tag/v0.5.1)
* Added `@lando/mean` version [`0.5.0`](https://github.com/lando/mean/releases/tag/v0.5.0)
* Added `@lando/symfony` version [`0.5.0`](https://github.com/lando/symfony/releases/tag/v0.5.0)
* Added `@lando/wordpress` version [`0.5.0`](https://github.com/lando/symfony/releases/tag/v0.5.0)

## v3.6.0 - [December 10, 2021](https://github.com/lando/cli/releases/tag/v3.6.0)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Core

* Added support for `php:8.1` [#3225](https://github.com/lando/lando/issues/3225)
* Switched `php:7.3`, `php:7.4`, `php:8.0`, `php:8.1` to Debian 11 base image to fix M1 seg fault when curling specific domains [#3200](https://github.com/lando/lando/issues/3200)
* Released generation 4 tags for php 7.3, 7.4, 8.0, 8.1
* Moved php 7.2 and below versions into legacy
* Spun out acquia plugin [#3215](https://github.com/lando/lando/issues/3215)
* Spun out amazee/lagoon plugin [#3209](https://github.com/lando/lando/issues/3209)
* Spun out pantheon plugin [#3196](https://github.com/lando/lando/issues/3196)
* Added Golang v1.17 Support [PR #60](https://github.com/lando/cli/pull/60)
* Added support for postgres 14, test 14, 13, 12, 11 and 10 [PR #60](https://github.com/lando/cli/pull/68)
* Added support for node 14 and 16, mark older versions legacy [PR #66](https://github.com/lando/cli/pull/66)

### Plugins

* Updated to `@lando/pantheon` version [`0.5.5`](https://github.com/lando/pantheon/releases/tag/v0.5.5)
* Updated to `@lando/lagoon` version [`0.5.2`](https://github.com/lando/lagoon/releases/tag/v0.5.2)
* Updated to `@lando/acquia` version [`0.5.2`](https://github.com/lando/acquia/releases/tag/v0.5.1)


## v3.5.1 - [October 29, 2021](https://github.com/lando/cli/releases/tag/v3.5.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Core

* Fixed bug causing long site names to prevent certificate creation causing site spin up failure [#3179](https://github.com/lando/lando/issues/3179)

### Plugins

* Updated to `@lando/platformsh` version [`0.6.0`](https://github.com/lando/platformsh/releases/tag/v0.6.0)

## v3.5.0 - [October 25, 2021](https://github.com/lando/cli/releases/tag/v3.5.0)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

### Core

* Added support for `mongodb` `4.4` and `5.0` [#45]
* Externalized `platformsh` recipe into its own [plugin](https://github.com/lando/platformsh)
* Improved external plugin loading [#2989](https://github.com/lando/lando/issues/2989)

### Plugins

#
### Platform.sh

* Updated to `@lando/platformsh` version `0.5.0`

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.4.3 - [October 6, 2021](https://github.com/lando/cli/releases/tag/v3.4.3)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed broken `/tmp` directory causing `drush` commands to fail in `platformsh` recipe [#3164](https://github.com/lando/lando/issues/3164)
* Improved `libssl` workaround so it runs _before_ `platformsh` build hooks [#3164](https://github.com/lando/lando/issues/3164)

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.4.2 - [October 5, 2021](https://github.com/lando/cli/releases/tag/v3.4.2)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* HOTFIX release to address expired root certs and `libssl` security update for `platformsh` recipe [#3164](https://github.com/lando/lando/issues/3164)

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.4.1 - [October 1, 2021](https://github.com/lando/cli/releases/tag/v3.4.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* HOTFIX release to address expired root certs and `libssl` security update for `pantheon` recipe [#3162](https://github.com/lando/lando/issues/3162)

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.4.0 - [September 15, 2021](https://github.com/lando/cli/releases/tag/v3.4.0)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `arm64` variants for still-supported Lando provided images eg `php`, `util`, `pantheon-index` and `pantheon-appserver` [#2688](https://github.com/lando/lando/issues/2688)
* Added version `1.0.1` to `mailhog` service
* Added version `5.1` to `phpmyadmin` service
* Improved `mailhog` so it is now a fully ARMed and operational service [#2688](https://github.com/lando/lando/issues/2688)
* Improved `pantheon` so it is now a mostly ARMed and operational recipe [#2688](https://github.com/lando/lando/issues/2688)
* Improved `varnish` so it is now a fully ARMed and operational service [#2688](https://github.com/lando/lando/issues/2688)
* Fixed bug in `load-keys.sh` which caused keys to not load in some situations eg `alpine:3.14` `grep` [#34](https://github.com/lando/cli/issues/34)

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.3.2 - [September 10, 2021](https://github.com/lando/cli/releases/tag/v3.3.2)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed breaking upstream change in `axios@0.21.2` causing some hosting integration API calls eg posting a key to Pantheon to fail

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.3.1 - [September 8, 2021](https://github.com/lando/cli/releases/tag/v3.3.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `devwithlando/util:4`
* Added ability to specify utility container version as part of `lando init`
* Added missing `$PATH` directories `/app/.global/bin`, `/app/.global/vendor/bin` to `platformsh` recipe [#30](https://github.com/lando/cli/pull/30)

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.3.0 - [August 23, 2021](https://github.com/lando/cli/releases/tag/v3.3.0)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support for `go` versions `1.15` and `1.16` [#14](https://github.com/lando/cli/pull/14)
* Added support for `database.version` in `pantheon.yml` [#16](https://github.com/lando/cli/issues/16)
* Fixed `dotnet` not working due to upstream change in Microsoft registry [#2711](https://github.com/lando/lando/issues/2711)
* Fixed `mssql` not working due to upstream change in Microsoft registry [#2711](https://github.com/lando/lando/issues/2711) [#12](https://github.com/lando/cli/issues/12)
* Fixed `push` in `lagoon` recipe to respect configured Drupal public file path [#3060](https://github.com/lando/lando/issues/3060)
* Fixed `pull` in `lagoon` recipe to not nest files too deeply [#3059](https://github.com/lando/lando/issues/3059)
* Fixed `null` key issue with `lagoon` recipe [#3058](https://github.com/lando/lando/issues/3058)
* Forced usage of `docker-compose-v1` for now [#3075](https://github.com/lando/lando/issues/3075) [#3076](https://github.com/lando/lando/issues/3076) [#3098](https://github.com/lando/lando/issues/3098)
* Introduced signed and notarized binaries as applicable for x64 and arm64 [#5](https://github.com/lando/cli/pull/5)

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).

## v3.2.1 - [May 10, 2021](https://github.com/lando/cli/releases/tag/v3.2.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support for `postgres` `13` [#2998](https://github.com/lando/lando/pull/2998)
* Added `elasticsearch` support to the `lagoon` recipe [#2996](https://github.com/lando/lando/pull/2996)
* Moved `acquia` recipe into `beta` readiness
* Switched `wordpress` recipe to use `php` `7.4` as the default version [#3004](https://github.com/lando/lando/pull/3004)
* Updated to Docker Desktop `3.3.3`
* Updated to Docker Compose `1.29.1`

**NOTE:* * These release notes may be incomplete, inconsistent, unreliable and generally weird until we complete the [THE GREAT BREAKUP](https://github.com/lando/lando/issues/2989).


## v3.1.2 - [April 20, 2021](https://github.com/lando/lando/releases/tag/v3.1.2)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed bug causing new `acquia` recipe ssh keys with the same label as previous keys to not be posted correctly
* Fixed bug causing `lando push` to fail when pushing code from an `acquia` recipe [#2960](https://github.com/lando/lando/issues/2960)
* Fixed bug causing `composer_version` to not work for `acquia` recipes [#2964](https://github.com/lando/lando/issues/2964)
* Fixed bug causing `solr` `8.5` and `8.6` to not data directory correctly [#2959](https://github.com/lando/lando/issues/2959)
* Switched `acquia` recipe to pull the `latest` stable `acli` instead of `master`
* Updated to Docker Desktop `3.3.1`

## v3.1.1 - [April 20, 2021](https://github.com/lando/lando/releases/tag/v3.1.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed bug causing new `acquia` recipe ssh keys with the same label as previous keys to not be posted correctly
* Fixed bug causing `lando push` to fail when pushing code from an `acquia` recipe [#2960](https://github.com/lando/lando/issues/2960)
* Fixed bug causing `composer_version` to not work for `acquia` recipes [#2964](https://github.com/lando/lando/issues/2964)
* Fixed bug causing `solr` `8.5` and `8.6` to not data directory correctly [#2959](https://github.com/lando/lando/issues/2959)
* Switched `acquia` recipe to pull the `latest` stable `acli` instead of `master`
* Updated to Docker Desktop `3.3.1`

## v3.1.0 - [April 12, 2021](https://github.com/lando/lando/releases/tag/v3.1.0)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support for Elasticsearch `7.10.x`, `7.11.x` and `7.12.x` [#2950](https://github.com/lando/lando/issues/2950)
* Added ability to disable automatic `acli pull:run-scripts` on `lando start/rebuild` for `acquia` recipes [#2956](https://github.com/lando/lando/issues/2956)
* Fixed bug preventing global fallback version of `drush` to be properly installed for `acquia` recipes [#2955](https://github.com/lando/lando/issues/2955)
* Fixed bug causing `portforward` user overrides to not work for the `lagoon` and `platformsh` recipes [#2749](https://github.com/lando/lando/issues/2749)
* Fixed bug causing `platformsh` recipes to prompt for `/app/.platform/local/lando` overwrite on `lando rebuild` [#2947](https://github.com/lando/lando/issues/2947)
* Updated to Drush `8.4.8` for legacy `drupal` recipes
* Updated to Docker Compose `1.29.0` [#2781](https://github.com/lando/lando/issues/2781) [#2780](https://github.com/lando/lando/issues/2780)
* Updated to Docker Desktop `3.3.0` [#2781](https://github.com/lando/lando/issues/2781) [#2780](https://github.com/lando/lando/issues/2780)

## v3.0.29 - [April 5, 2021](https://github.com/lando/lando/releases/tag/v3.0.29)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* **Fixed longstanding bug causing container to container `*.lndo.site` resolution to differ from proxy-based resolution [#2934](https://github.com/lando/lando/issues/2934), this results in a change of behavior that may impact how your app works in Lando, read more [here](https://docs.lando.dev/config/networking.html#port-considerations)**

* Improved `xdebug` support and docs for `platformsh` recipes [#2927](https://github.com/lando/lando/issues/2927)
* Updated dependencies to be compatible with `node` 14 [#2945](https://github.com/lando/lando/issues/2945) [#2928](https://github.com/lando/lando/issues/2928)

## v3.0.28 - [March 26, 2021](https://github.com/lando/lando/releases/tag/v3.0.28)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Hotfixed `*.lndo.site` going away for `drupaly` recipes [#2934](https://github.com/lando/lando/issues/2934)

## v3.0.27 - [March 25, 2021](https://github.com/lando/lando/releases/tag/v3.0.27)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added experimental `alpha` support for `acquia` recipe [read more](https://docs.lando.dev/config/acquia.html)
* Reverted auto `nvm` sourcing for `platform.sh` recipes in favor of manual `.environment` spec [#2820](https://github.com/lando/lando/issues/2820)
* Set `DOCKER_BUILDKIT=1` to force emulation for now [#2688](https://github.com/lando/lando/issues/2688)
* Set `vm.max_map_count` only if necessary and writable [#2884](https://github.com/lando/lando/issues/2880)
* Switched to use `semver.coerce()` to get a valid semantic version number for PHP. [#2884](https://github.com/lando/lando/issues/2884)

## v3.0.26 - [February 23, 2021](https://github.com/lando/lando/releases/tag/v3.0.26)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `freetype` to `php` `8.0` `gd` extenstion [#2865](https://github.com/lando/lando/issues/2865)
* Added support for `mariab` `10.5` [#2856](https://github.com/lando/lando/issues/2856)
* Fixed bug preventing `prestissimo` uninstall on alternate format `composer_versions` [#2870](https://github.com/lando/lando/issues/2870)
* Improved Lockr integration so its compatibilty with new Pantheon app structure [#2859](https://github.com/lando/lando/issues/2859)
* Improved availability of `render-template` across `nginx` versions [#2760](https://github.com/lando/lando/issues/2760)
* Improved various UX and docs things
* Updated `mariadb` `10.x` images [#2856](https://github.com/lando/lando/issues/2856)
* Updated `php` `8.0` image to latest `8.0.2` [#2865](https://github.com/lando/lando/issues/2865)

## v3.0.25 - [February 2, 2021](https://github.com/lando/lando/releases/tag/v3.0.25)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support for `lagoon.type == none` [#2828](https://github.com/lando/lando/issues/2828)
* Added `6.0` to list of supported `redis` versions
* Added "dumb" support for the `drupal9` `pantheon` framework [#2831](https://github.com/lando/lando/issues/2831)
* Fixed bug causing build hook installed `composer` version to not load correctly in `platformsh` recipe [#2826](https://github.com/lando/lando/issues/2826)
* Fixed bug causing `nvm` installed `node` versions to not load correctly in `platformsh` recipe when invoked via tooling [#2820](https://github.com/lando/lando/issues/2820)
* Fixed bug causing `composer` install to fail on `php` `8.0` [#2729](https://github.com/lando/lando/issues/2729)
* Fixed bug causing `port` to not be passed in correctly when authing against custom `lagoon` instance
* Improved `lando pull` for `lagoon` recipes to handle other files directory locations [#2762](https://github.com/lando/lando/issues/2762)
* Improved error message when `lando` cannot detect any `platformsh` applications for `platformsh` recipes [#2822](https://github.com/lando/lando/issues/2822)
* Improved error message when `lando` cannot detect a `lagoon.yml` for `lagoon` recipes [#2818](https://github.com/lando/lando/issues/2818)
* Updated `pantheon` recipe to use `wkhtmltopdf` version `0.12.5` in _most_ `php` images
* Updated `pantheon` recipe to use `terminus` version `2.5.0`
* Updated to Docker Desktop `3.1.0` and provided wider future patch support because https://github.com/docker/roadmap/issues/183

## v3.0.24 - [December 14, 2020](https://github.com/lando/lando/releases/tag/v3.0.24)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Updated to Docker Desktop for Mac to `3.0.1`
* Updated to Docker Desktop for Windows to `3.0.0`

## v3.0.23 - [December 11, 2020](https://github.com/lando/lando/releases/tag/v3.0.23)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support up to Docker Engine `2.10.0` [#2729](https://github.com/lando/lando/issues/2729)
* Added some convenience labels for `composer_version` [#2729](https://github.com/lando/lando/issues/2729)
* Fixed bug causing unknown user to be incorrectly reported
* Fixed bug causing `platformsh` recipes to fail when no `routes` are present [#2740](https://github.com/lando/lando/issues/2740)

## v3.0.22 - [December 2, 2020](https://github.com/lando/lando/releases/tag/v3.0.22)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support for `php` 8 [#2660](https://github.com/lando/lando/issues/2660)
* Added support for `redis` 6 [#2683](https://github.com/lando/lando/issues/2683)
* Added support for `xdebug` 3 [#2718](https://github.com/lando/lando/issues/2718)
* Added `symfony` recipe [#1665](https://github.com/lando/lando/issues/1665)
* Updated default `composer` version to `2.0.7` [#2720](https://github.com/lando/lando/issues/2720)
* Updated `pantheon` recipe to use `composer` 2 by default

## v3.0.21 - [November 30, 2020](https://github.com/lando/lando/releases/tag/v3.0.21)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Improved `platformsh` recipe so `services` can also be overriden locally [#2710](https://github.com/lando/lando/issues/2710)
* Updated to Docker Desktop `2.5.0.1`, fixes issues with macOS Big Sur [#2702](https://github.com/lando/lando/issues/2702)
* Set default `php` version for `drupal9` recipe to `7.4`, fixes [#2703](https://github.com/lando/lando/issues/2703)

## v3.0.20 - [November 20, 2020](https://github.com/lando/lando/releases/tag/v3.0.20)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Improved detection and feedback around unsupported `platform.sh` services and languages
* Improved `lando push` for `platformsh` recipes so it more accurately tracks branch
* Fixed bug causing `lando pull/push` to fail on `platformsh` recipes when branch cannot be detected correctly
* Fixed bug causing tooling to not load correctly for `platformsh` recipes when there is no app in the project root

## v3.0.19 - [November 13, 2020](https://github.com/lando/lando/releases/tag/v3.0.19)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed bug causing `lando pull/push` to use branch name instead of env name for `lagoon` recipes [#2685](https://github.com/lando/lando/issues/2685)
* Fixed bug causing crash when `platformsh` recipe has nested `.platform.app.yaml`

## v3.0.18 - [November 9, 2020](https://github.com/lando/lando/releases/tag/v3.0.18)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `lando pull` and `lando push` for `lagoon` recipes [#2644](https://github.com/lando/lando/issues/2644)
* Fixed bug causing crash when some special characters are used in app names
* Fixed bug causing private keys without corresponding public keys to be ignored
* Updated to Docker Desktop `2.5.0.0`

## v3.0.17 - [October 30, 2020](https://github.com/lando/lando/releases/tag/v3.0.17)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `/app/bin` to `PATH` for `platformsh` recipes
* Added ability to specify `dir` for `tooling` commands [#2549](https://github.com/lando/lando/issues/2549)
* Fixed bug causing `platformsh` to not `pull` or `push` using the correct environment [#2467](https://github.com/lando/lando/issues/2467)
* Fixed bug causing internal proxy route usage to fail when using non-standard ports [#2579](https://github.com/lando/lando/issues/2579)
* Improved `drush` handling on `drupal9` recipes [#2582](https://github.com/lando/lando/issues/2582) [#2550](https://github.com/lando/lando/issues/2550)
* Made `composer` version configurable in relevant `services` and `recipes` [#2658](https://github.com/lando/lando/issues/2658)
* Removed `X-Frame-Options SAMEORIGIN` header for Nginx service default config [#2648](https://github.com/lando/lando/pull/2648)
* Set default `composer` version to `2.0.3` [#2658](https://github.com/lando/lando/issues/2658)
* Updated to Docker Desktop `2.4.0.0` and Docker Compose `1.27.4` [#2657](https://github.com/lando/lando/issues/2657)
* Updated Terminus to `2.4.1` for `pantheon` recipes

## v3.0.16 - [October 16, 2020](https://github.com/lando/lando/releases/tag/v3.0.16)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `lando init --source lagoon` [#2450](https://github.com/lando/lando/issues/2450)
* Improved `platformsh` build process to ensure `mounts` exist
* Changed `lando pull/push` for `platformsh` recipes, `-r none` or `-m none` will now skip
* Changed `platformsh` route handling to remove FQDNs
* Fixed bug causing `-m mount` or `-r relationship` syntax to not array correctly for `platformsh` recipes
* Removed non-database relationship options from `lando pull/push` for `platformsh` recipes

## v3.0.15 - [October 7, 2020](https://github.com/lando/lando/releases/tag/v3.0.15)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added a more robust way to override `platform` application config from lando [#2445](https://github.com/lando/lando/pull/2445)
* Added support to all `platformsh` custom `YAML` types [#2445](https://github.com/lando/lando/pull/2445)
* Fixed bug causing unauthed `platformsh` recipes to ask for source/destination on build [#2612](https://github.com/lando/lando/pull/2612)
* Improved `platformsh` `varnish` service to be dependent on `backends` [#2445](https://github.com/lando/lando/pull/2445)

## v3.0.14 - [September 28, 2020](https://github.com/lando/lando/releases/tag/v3.0.14)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Hotfix release to fix breaking Pantheon `$settings` change [#2619](https://github.com/lando/lando/pull/2619) [#2617](https://github.com/lando/lando/pull/2617)

## v3.0.13 - [September 25, 2020](https://github.com/lando/lando/releases/tag/v3.0.13)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added compatibility for Docker Compose `1.27.x`
* Added support for `node` `14`
* Added support for recent `solr` `7.x` and `8.x` versions [#2599](https://github.com/lando/lando/pull/2599)
* Added support for recent `elasticsearch` `7.x` versions [#2575](https://github.com/lando/lando/pull/2575)
* Changed service certs to be owned by "you" [#2335](https://github.com/lando/lando/pull/2335)
* Fixed bug causing `db-import` wipe to fail on `views` [#2516](https://github.com/lando/lando/pull/2516)
* Fixed bug causing `db-import` wipe to fail on table names with hypens [#2478](https://github.com/lando/lando/pull/2478)
* Fixed bug causing `lando pull` to not correctly exclude `cache` data for `pantheon` sites
* Fixed bug causing `jq not found` when init `platformsh` recipes [#2583](https://github.com/lando/lando/pull/2583)
* Fixed bug causing manually installed during build php extensions to not be available in `platformsh` recipes [#2583](https://github.com/lando/lando/pull/2583)
* Fixed bug caused by `PLATFORM_PROJECT_ENTROPY` not being set correctly [#2583](https://github.com/lando/lando/pull/2583)
* Fixed bug causing `lando pull` on `pantheons` apps to always pull from `dev` [#2578](https://github.com/lando/lando/pull/2578)
* Fixed bug causing `mariadb` to fail on `lando restart` for `lagoon` recipes [#2411](https://github.com/lando/lando/pull/2411)
* Fixed bug causing `lando pull` to fail on `pantheon` db pull when app prints error [#2561](https://github.com/lando/lando/pull/2561)
* Fixed breaking upstream change in Docker Desktop for Windows 2.3.0.5 [#2610](https://github.com/lando/lando/pull/2610)
* Improved error message if Docker cannot be autostarted [#2351](https://github.com/lando/lando/pull/2351)
* Improved `pantheon` `edge` cookie stripping on static assets [#2566](https://github.com/lando/lando/pull/2566)
* Improved authentication flow for `pantheon` apps [#2403](https://github.com/lando/lando/pull/2403)
* Set `skip_permission_hardening` to `true` by default on Pantheon Drupal sites [#2504](https://github.com/lando/lando/pull/2504)
* Removed experimental `mutagen` support [#2354](https://github.com/lando/lando/pull/2354)
* Updated to Docker Desktop `2.3.0.5`
* Updated to Docker Compose `1.27.2`

## v3.0.12 - [September 24, 2020](https://github.com/lando/lando/releases/tag/v3.0.12)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added compatibility for Docker Compose `1.27.x`
* Added support for `node` `14`
* Added support for recent `solr` `7.x` and `8.x` versions [#2599](https://github.com/lando/lando/pull/2599)
* Added support for recent `elasticsearch` `7.x` versions [#2575](https://github.com/lando/lando/pull/2575)
* Changed service certs to be owned by "you" [#2335](https://github.com/lando/lando/pull/2335)
* Fixed bug causing `db-import` wipe to fail on `views` [#2516](https://github.com/lando/lando/pull/2516)
* Fixed bug causing `db-import` wipe to fail on table names with hypens [#2478](https://github.com/lando/lando/pull/2478)
* Fixed bug causing `lando pull` to not correctly exclude `cache` data for `pantheon` sites
* Fixed bug causing `jq not found` when init `platformsh` recipes [#2583](https://github.com/lando/lando/pull/2583)
* Fixed bug causing manually installed during build php extensions to not be available in `platformsh` recipes [#2583](https://github.com/lando/lando/pull/2583)
* Fixed bug caused by `PLATFORM_PROJECT_ENTROPY` not being set correctly [#2583](https://github.com/lando/lando/pull/2583)
* Fixed bug causing `lando pull` on `pantheons` apps to always pull from `dev` [#2578](https://github.com/lando/lando/pull/2578)
* Fixed bug causing `mariadb` to fail on `lando restart` for `lagoon` recipes [#2411](https://github.com/lando/lando/pull/2411)
* Fixed bug causing `lando pull` to fail on `pantheon` db pull when app prints error [#2561](https://github.com/lando/lando/pull/2561)
* Improved `pantheon` `edge` cookie stripping on static assets [#2566](https://github.com/lando/lando/pull/2566)
* Improved authentication flow for `pantheon` apps [#2403](https://github.com/lando/lando/pull/2403)
* Set `skip_permission_hardening` to `true` by default on Pantheon Drupal sites [#2504](https://github.com/lando/lando/pull/2504)
* Removed experimental `mutagen` support [#2354](https://github.com/lando/lando/pull/2354)
* Updated to Docker Desktop `2.3.0.5`
* Updated to Docker Compose `1.27.2`

## v3.0.11 - [July 31, 2020](https://github.com/lando/lando/releases/tag/v3.0.11)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added ability to override `platformsh` `variables` locally in Landofile
* Added interactivity to `platformsh` `pull` and `push` [#2496](https://github.com/lando/lando/pull/2496)
* Fixed bug causing the `proxy` to report `404` when using more than one `platformsh` app [#2507](https://github.com/lando/lando/pull/2507)
* Fixed bug causing `platformsh` recipe build to fail when webroot doesn't exist [#2529](https://github.com/lando/lando/pull/2529)
* Improved `lando init` for `platformsh` eg faster and supports MFA
* Updated to Docker Desktop `2.3.0.4` and Docker Compose `1.26.2`. Fixed [#2531](https://github.com/lando/lando/pull/2531)

## v3.0.10 - [July 27, 2020](https://github.com/lando/lando/releases/tag/v3.0.10)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added ability to configure the `proxy` middleware layer [#2507](https://github.com/lando/lando/pull/2507)
* Added `platformsh` specific headers to the `platformsh` recipe [#2507](https://github.com/lando/lando/pull/2507)
* Fixed bug causing `HTTPS` to not be set correctly on `platformsh` recipes [#2507](https://github.com/lando/lando/pull/2507)
* Fixed bug causing `lando` to fail if `~/.ssh` doesn't exist [#2501](https://github.com/lando/lando/pull/2501)
* Fixed bug causing `events` for `platformsh` recipes to not run with correct env
* Fixed bug causing multicommand tooling for `platformsh` recipes to not run correctly
* Improved handling of `primary` route in `platformsh` recipe [#2508](https://github.com/lando/lando/pull/2508)

[What does pre-release mean?](https://docs.lando.dev/config/releases.html)

## v3.0.9 - [July 17, 2020](https://github.com/lando/lando/releases/tag/v3.0.9)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `command` support for `php` cli services [#2479](https://github.com/lando/lando/pull/2479)
* Added symlink from `/code -> /app` for `pantheon` apps [#2421](https://github.com/lando/lando/pull/2421)
* Fixed bug causing `lando push` commit message to get truncated to first word [#2492](https://github.com/lando/lando/pull/2492)
* Improved `db-import` and `lando pull` to handle foreign key constraints [#1850](https://github.com/lando/lando/pull/1850) [#2391](https://github.com/lando/lando/pull/2391)
* And various documentation improvements

[What does pre-release mean?](https://docs.lando.dev/config/releases.html)

## v3.0.8 - [July 14, 2020](https://github.com/lando/lando/releases/tag/v3.0.8)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support for loading `plugins` from your application repo [#2434](https://github.com/lando/lando/pull/2434)
* Bumped `platformsh` recipe to `alpha` status [#2444](https://github.com/lando/lando/pull/2444)
* Bumped `lagoon` recipe to `alpha` status [#2451](https://github.com/lando/lando/pull/2451)
* Fixed bug causing some interactive options to not be passed through correctly [#2456](https://github.com/lando/lando/pull/2456) [#2471](https://github.com/lando/lando/pull/2471)
* Improved database pull performance for the `pantheon` recipe [#2402](https://github.com/lando/lando/pull/2402)
* Improved error message if host-side `terminus` token caches contain invalid `JSON` [#2428](https://github.com/lando/lando/pull/2428)
* Switched all usage of `:delegated` to `:cached` in preperation of `mutagen` syncing [#763](https://github.com/lando/lando/pull/763) [#2354](https://github.com/lando/lando/pull/2354)
* Updated default `drupal8` recipe `php` version to `7.3` [#2427](https://github.com/lando/lando/pull/2427)
* Updated `excludes` to use `mutagen` if its available [#763](https://github.com/lando/lando/pull/763) [#2354](https://github.com/lando/lando/pull/2354)

## v3.0.7 - [June 27, 2020](https://github.com/lando/lando/releases/tag/v3.0.7)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added ability to configure `USER` and `PORT` for `sql-import` and `sql-export` scripts with envvars
* Added ability to set environment variables for tooling commands [#2128](https://github.com/lando/lando/pull/2128)
* Changed `/user` and `/lando` mounting to use `:cached` in preperation for Mutagen
* Fixed bug causing non-semantic `drush` versions like `*` and `^` to throw errors [#2386](https://github.com/lando/lando/pull/2386)
* Fixed bug causing custom config files in `nginx` service to be modified unexpectedly [#2383](https://github.com/lando/lando/pull/2383)
* Fixed bug causing first touch non-start engine commands to fail
* Improved `/bin/sh` wrapping of tooling commands [#2279](https://github.com/lando/lando/pull/2279) [#2280](https://github.com/lando/lando/pull/2280)
* Loosened key add restrictions to improve key loading on `macOS` High Sierra [#2415](https://github.com/lando/lando/pull/2415)
* Removed excessively frequent `WARN` messages [#2389](https://github.com/lando/lando/pull/2389)
* Updated Terminus to `2.4.0` [#2417](https://github.com/lando/lando/issues/2417)

## v3.0.6 - [June 9, 2020](https://github.com/lando/lando/releases/tag/v3.0.6)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed bug causing non-semantic `drush` versions like `*` and `false` to throw errors [#2372](https://github.com/lando/lando/pull/2372)

## v3.0.5 - [June 5, 2020](https://github.com/lando/lando/releases/tag/v3.0.5)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added _experimental_ support for WordPress Site Networks (Multisite) to Pantheon recipe [#1425](https://github.com/lando/lando/pull/1425)
* Added `/app/bin` into the `php` service `PATH` [#2328](https://github.com/lando/lando/pull/2328)
* Fixed bug causing "command" output to be unreadable on some terminals [#2302](https://github.com/lando/lando/pull/2302)
* Fixed bug causing `stdin` to not be read correctly for some tooling commands eg `lando drush sql-cli < dump.sql` [#1918](https://github.com/lando/lando/pull/1918)
* Fixed regression in `db-import` causing tables to not be dropped correctly
* Fixed regression causing the version in `via: nginx:1.16` to not be picked up correctly [#2300](https://github.com/lando/lando/pull/2300)
* Improved performance of user permisson `host:container` mapping [#2300](https://github.com/lando/lando/pull/2300)
* Improved `lando ssh` so that it now uses the first defined service as the default if `appserver` does not exist [#2300](https://github.com/lando/lando/pull/2300)
* Updated `varnish` ssl termination to use `nginx` `1.17` [#2300](https://github.com/lando/lando/pull/2300)

## v3.0.4 - [May 31, 2020](https://github.com/lando/lando/releases/tag/v3.0.4)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added an app warning for installing Drush `10+` globally
* Added support for `nginx` `1.16`, `1.17` and `1.18`
* Added support for Docker Desktop `2.3.0.3`
* Changed default `nginx` version to `1.17`
* Deprecated `nginx` version `1.14`
* Updated to Docker Desktop `2.3.0.3`

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.3 - [May 15, 2020](https://github.com/lando/lando/releases/tag/v3.0.3)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added a [guide](https://docs.lando.dev/guides/using-compass-on-a-lando-node-service.html) on how to use `compass` in `node` service [#2039](https://github.com/lando/lando/pull/2039)
* Added support for `php` `7.4` to `pantheon` recipes [#2259](https://github.com/lando/lando/pull/2259)
* Added support for `apache` `tika` `1.18` to supported Pantheon `appservers`
* Fixed bug causing `Operation not permitted` for some `db-import|export` commands [#2255](https://github.com/lando/lando/pull/2255)
* Fixed bug causing `ssh` keys to be incorrectly set to `700` [#2260](https://github.com/lando/lando/pull/2260)
* Fixed bug causing overridden `ports` expressed as objects to error [#2256](https://github.com/lando/lando/pull/2256)

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.2 - [May 12, 2020](https://github.com/lando/lando/releases/tag/v3.0.2)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added `none` as a Release Channel option
* Added a [guide](https://docs.lando.dev/guides/installing-php-extensions-on-lando.html) on how to install `php` extensions [#1894](https://github.com/lando/lando/pull/1894) [#1906](https://github.com/lando/lando/pull/1906) [#2201](https://github.com/lando/lando/pull/2201) [#2240](https://github.com/lando/lando/pull/2240)
* Added a [guide](https://docs.lando.dev/guides/installing-node-in-your-lando-php-service.html) on how to install `node` directly in a PHP service for things like PatternLab or Emulsify [#2196](https://github.com/lando/lando/pull/2196)
* Added support for `mongo` `4.2` [#2246](https://github.com/lando/lando/pull/2246)
* Added a `drupal9` **(beta)* * recipe [#1993](https://github.com/lando/lando/pull/1993)
* Added `none` as a Release Channel option [#2218](https://github.com/lando/lando/pull/2218)
* Deprecated `mongo` version `4.1` [#2246](https://github.com/lando/lando/pull/2246)
* Fixed bug where `cache: none` in the Laravel recipe config caused a start error [#2236](https://github.com/lando/lando/pull/2236)
* Fixed bug causing `nginx` and `apache` to sometimes fail on a rebuild [#1986](https://github.com/lando/lando/pull/1986)
* Fixed bug causing `db-import` to not recognize some dumps from `db-export` [#2170](https://github.com/lando/lando/pull/2170)
* Fixed bug causing `db-export` to report success even when it had been cancelled on `gzip` overwrite [#2231](https://github.com/lando/lando/pull/2231)
* Fixed bug causing some Docker Engine versions on Linux to incorrectly throw an incompatibility warning [#2239](https://github.com/lando/lando/pull/2239)
* Updated default `mongo` version to `4.2` [#2246](https://github.com/lando/lando/pull/2246)
* Updated to and added support to Docker Desktop `2.3.0.2`
* Updated to and added support for `docker-compose` `1.25.5` on Linux
* Many more spelling and grammar fixes in docs, code and comments, thanks [@uberhacker](https://github.com/uberhacker)!

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.1 - [May 7, 2020](https://github.com/lando/lando/releases/tag/v3.0.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed regression in `build` and `event` quote passthrough logic causing other commands to not parse correctly [#1926](https://github.com/lando/lando/pull/1926)
* Fixed race condition causing proxy certs to not refresh consistently on proxy changes

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.0 - [May 4, 2020](https://github.com/lando/lando/releases/tag/v3.0.0)

### This is an `edge` release.

Edge releases contain the newest bug fixes and features and *may * be less stable as a result. If you are an intrepid developer who wants to try the latest and greatest and/or wants to help report bugs then try this release out.

Otherwise, scroll down and use the first release that has the green `Latest Release` tag. For more information about the Lando release cycle check out [this](https://docs.lando.dev/config/releases.html).

* Added ability to customize or disable the `app_mount` on a per-service basis [#2029](https://github.com/lando/lando/issues/2029) [#1487](https://github.com/lando/lando/issues/1487)
* Fixed bug preventing recipe provided tooling from being `disabled` [#472](https://github.com/lando/lando/pull/472)
* Fixed bug not allowing build steps on Lando managed services eg `appserver_nginx` [#1990](https://github.com/lando/lando/pull/1990)
* Fixed bug not allowing user overrides on Lando managed services eg `appserver_nginx` [#1990](https://github.com/lando/lando/pull/1990)
* Fixed bug causing `PATH_INFO` and `PATH_TRANSLATED` to not be set by default on `php` services served by `nginx` [#2192](https://github.com/lando/lando/pull/2192)
* Fixed bug causing `PATH_INFO` and `PATH_TRANSLATED` to not be set by default on the `lemp` recipe [#2192](https://github.com/lando/lando/pull/2192)
* Fixed bug causing Lando to pass through the quotes on build steps or events that contained options like `--option="some thing"` [#1926](https://github.com/lando/lando/pull/1926)
* Improved overridability of `pantheon` `push|pull|switch` commands [#2166](https://github.com/lando/lando/pull/2166)
* Blasted this thing straight out of Mos Eisley [#6](https://www.youtube.com/watch?v=d9Am7nUiIyU)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.0-rrc.8 - [May 3, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.8)

### This is an `edge` release.

Edge releases contain the newest bug fixes and features and *may * be less stable as a result. If you are an intrepid developer who wants to try the latest and greatest and/or wants to help report bugs then try this release out.

Otherwise, scroll down and use the first release that has the green `Latest Release` tag. For more information about the Lando release cycle check out [this](https://docs.lando.dev/config/releases.html).

* Added warnings if user is using unsupported Docker versions [#678](https://github.com/lando/lando/pull/678)
* Improved Lando update check to be non-blocking
* Improved warnings if needed Docker dependencies are not installed [#1901](https://github.com/lando/lando/pull/1901)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.0-rrc.7 - [April 30, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.7)

### This is an `edge` release.

Edge releases contain the newest bug fixes and features and *may * be less stable as a result. If you are an intrepid developer who wants to try the latest and greatest and/or wants to help report bugs then try this release out.

Otherwise, scroll down and use the first release that has the green `Latest Release` tag. For more information about the Lando release cycle check out [this](https://docs.lando.dev/config/releases.html).

* Fixed bug where `proxy` was not honoring new `bindAddress` or `proxyBindAddress` settings [#2200](https://github.com/lando/lando/pull/2200)
* Fixed bug causing Lando to not install on versions of macOS it actually supports [#2203](https://github.com/lando/lando/pull/2203)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.0-rrc.6 - [April 28, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.6)

### This is an `edge` release.

Edge releases contain the newest bug fixes and features and *may * be less stable as a result. If you are an intrepid developer who wants to try the latest and greatest and/or wants to help report bugs then try this release out.

Otherwise, scroll down and use the first release that has the green `Latest Release` tag. For more information about the Lando release cycle check out [this](https://docs.lando.dev/config/releases.html).

* Silenced `loadkeys` on `inits` that require key loading
* Improved `node` service so it uses the `node` user if it does not use privileged ports
* Improved app reporting so it doesnt hang the process if reporting node is spinning
* Fixed bug where you needed to run `lando rebuild` twice to clear the "This app was built on a different version of Lando" warning
* Fixed bug where `proxy` was not finding the correct port for multi-port proxied services
* Fixed bug where `node` services using a custom `ssl` port do not get assigned a `https://localhost:PORT` address correctly
* Fixed bug where failed `healthchecks` were not sending correct error code
* Fixed bug causing `mongodb` services to fail healthchecks
* Fixed bug causing `maxKeyWarning` to continue showing even after user has taken action [#2186](https://github.com/lando/lando/pull/2186)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.0-rrc.5 - [April 25, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.5)

### This is an `edge` release.

Edge releases contain the newest bug fixes and features and *may * be less stable as a result. If you are an intrepid developer who wants to try the latest and greatest and/or wants to help report bugs then try this release out.

Otherwise, scroll down and use the first release that has the green `Latest Release` tag. For more information about the Lando release cycle check out [this](https://docs.lando.dev/config/releases.html).

* Added _extremely experimental_, for-testing-purposes-only support for Lagoon Drupal 8 projects, [read more](https://docs.lando.dev/config/lagoon.html)
* Added legacy `SIMPLETEST_` envvars to Drupaly recipes [#1269](https://github.com/lando/lando/pull/1269)
* Added ability for users to control which host `ssh` keys Lando uses [#2031](https://github.com/lando/lando/pull/2031)
* Added reasonable `max-file` and `max-size` limits to services so logs don't grow indefinitely [#1774](https://github.com/lando/lando/pull/1774)
* Added `proxy` support for any level of subdomains [#1819](https://github.com/lando/lando/pull/1819)
* Changed the default bind address to `127.0.0.1` and made `bindAddress` globally configurable [#2035](https://github.com/lando/lando/pull/2035)
* Fixed regression causing weird newlines on some console output [#2178](https://github.com/lando/lando/pull/2178)
* Fixed bug causing Pantheon `pull` and `push` to fail when checked out to branch that wasnt also a multidev env [#2153](https://github.com/lando/lando/pull/2153)
* Fixed bug causing Pantheon `lando push` to push to unexpected environments [#2153](https://github.com/lando/lando/pull/2153)
* Fixed bug causing `ERR_INVALID_REDIRECT` for some proxied servives [#2149](https://github.com/lando/lando/pull/2149)
* Fixed bug causing app start to fail if proxy was unable to locate suitable ports [#1857](https://github.com/lando/lando/pull/1857)
* Fixed bug causing `ssh` to fail when username or keypaths had spaces in them [#2031](https://github.com/lando/lando/pull/2031)
* Improved logging and error handling
* Improved spelling and grammar in docs, code and comments, thanks [@uberhacker](https://github.com/uberhacker)!
* Upgraded to `traefik` 2.2 [#1819](https://github.com/lando/lando/pull/1819)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: <https://docs.lando.dev/>**

## v3.0.0-rrc.4 - [April 11, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.4)

### This is an `edge` release.

Edge releases contain the newest bug fixes and features and *may * be less stable as a result. If you are an intrepid developer who wants to try the latest and greatest and/or wants to help report bugs then try this release out.

Otherwise, scroll down and use the first release that has the green `Latest Release` tag. For more information about the Lando release cycle check out [this](https://docs.lando.dev/config/releases.html).

* Added support for `postgres:12` [#2133](https://github.com/lando/lando/pull/2133)
* Added a `lando rebuild` warning if app becomes out of sync with Lando [#2098](https://github.com/lando/lando/pull/2098)
* Added option to configure the `default-authentication-plugin` for `mysql:8` services [#2135](https://github.com/lando/lando/pull/2135)
* Improved "starty" UX to communicate warnings eg "a healthcheck failed" better [#1088](https://github.com/lando/lando/pull/1088)
* Improved app start so it throws helpful instructions when start fails [#2098](https://github.com/lando/lando/pull/2098)
* Improved healthchecks so they no longer consume CPU while idle [#1088](https://github.com/lando/lando/pull/1088)
* Improved `proxy` so it automatically recreates itself when Lando is updated
* Improved `external_connection.host` so it uses `127.0.0.1` instead of `localhost`, this helps situations where the user has `mysql` running over a socket on their host
* Fixed bug causing a custom named `landoFile` and custom pre and post Landofiles to not be recognized correctly #1919](https://github.com/lando/lando/pull/1919)
* Fixed bug causing all multicommand tooling to run as `www-data` instead of the `meUser` eg `node` for node services [#1877](https://github.com/lando/lando/pull/1877)
* Fixed bug causing services built from local Dockerfiles to error when run from subdirectories [#2102](https://github.com/lando/lando/pull/1877)
* Fixed bug causing recipes to not properly identify pullable and locally built services
* Fixed bug causing `lando push --code` to fail if `git` `user.name` or `user.email` are not set [#47](https://github.com/pantheon-systems/localdev-issues/issues/47)
* Set `default-authentication-plugin` to `mysql_native_password` for LAMP MySQL 8 recipes [#2135](https://github.com/lando/lando/pull/2135)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.lando.dev/**

## v3.0.0-rrc.3 - [April 2, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.3)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added separate `edge` and `stable` release channels, [read more](https://docs.lando.dev/config/releases.html)
* Added an `experimental` flag so users can access bleeding edge features, [read more](https://docs.lando.dev/config/experimental.html)
* Added `PATH_INFO` and `PATH_TRANSLATED` to the default `nginx` `fastcgi_params` [#1987](https://github.com/lando/lando/pull/1987)
* Added `webp` support to `php 7` images [#1715](https://github.com/lando/lando/pull/1715)
* Added subdirectory support to the `proxy` [#1824](https://github.com/lando/lando/pull/1824)
* Added support for `pantheon.yml`'s' `drush_version`
* Increased limit on amount of sites we can get from the Pantheon API [#988](https://github.com/lando/lando/pull/988)
* Fixed bug where `PATH_INFO` was not set in the `pantheon` recipe [#1987](https://github.com/lando/lando/pull/1987)
* Fixed bug causing a silent error when trying to `lando pull --code test|live` using `pantheon` recipe [#2021](https://github.com/lando/lando/pull/2021)
* Fixed bug causing Windows path separators to cause SQL Import/Export scripts to fail [#1823](https://github.com/lando/lando/issues/1823)
* Fixed bug causing `--host` flag using `=` to produce unexpected results on `db-import/export` [#2007](https://github.com/lando/lando/pull/2007)
* Improved `lando db-import` and `lando db-export` to allow absolute paths [#1768](https://github.com/lando/lando/pull/1768)
* Improved feedback from `lando db-import` and `lando db-export` commands [#2027](https://github.com/lando/lando/pull/2027)
* Improved tooling `stdio` configurability and `stderr` discovery [#2021](https://github.com/lando/lando/pull/2021)
* Readded previous `phpmyadmin` `4.x` versions for better backwards compatibility [#2062](https://github.com/lando/lando/pull/2062)
* Set `COMPOSER_MEMORY_LIMIT` to '-1'
* Updated to `composer` version `1.10.1` [#2096](https://github.com/lando/lando/pull/2096)
* Updated to latest `xdebug` in `php` version `7.4` [#2099](https://github.com/lando/lando/pull/2099)
* Updated `drush 8` to `8.3.2` [#2097](https://github.com/lando/lando/pull/2097)
* Updated to Docker Desktop `2.2.0.5` [#2052](https://github.com/lando/lando/pull/2052) [#2122](https://github.com/lando/lando/pull/2122)

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.lando.dev/**

## v3.0.0-rrc.2 - [March 25, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.2)

### This is an `edge` release.

Edge releases contain the newest bug fixes and features and *may * be less stable as a result. If you are an intrepid developer who wants to try the latest and greatest and/or wants to help report bugs then try this release out.

Otherwise, scroll down and use the first release that has the green `Latest Release` tag. For more information about the Lando release cycle check out [this](https://docs.lando.dev/config/releases.html).

* Added support for `go` versions `1.12-1.14`,
* Added support for `solr` `8` [#1765](https://github.com/lando/lando/pull/1765)
* Added new `solr` `7` minor versions [#1765](https://github.com/lando/lando/pull/1765)
* Added support for `.mjs` files in `nginx` [#1537](https://github.com/lando/lando/issues/1537)
* Added documentation on how to set `vm.max_map_count` correctly if you cannot run `elasticsearch` correctly [#1967](https://github.com/lando/lando/issues/1967)
* Fixed bug caused by setting `TERMINUS_VERSION` in Pantheon appserver images [#1872](https://github.com/lando/lando/issues/1872)
* Fixed bug causing build steps to not run if app was manually removed [#2079](https://github.com/lando/lando/issues/2079)
* Fixed bug with app name names containing spaces [#1767](https://github.com/lando/lando/issues/1767)
* Fixed bug causing crash on `macOS` if Docker is not installed first
* Fixed bug causing CLI array data to vanish on Windows, thanks @rabauss! [#2063](https://github.com/lando/lando/issues/2063)
* Officially documented file performance `excludes` feature [#763](https://github.com/lando/lando/issues/763) [#1460](https://github.com/lando/lando/issues/1460)
* Updated `go` to use `1.14` as the default version [#2009](https://github.com/lando/lando/issues/2009)
* Updated `phpmyadmin` to use `5.0` as the default version [#2062](https://github.com/lando/lando/issues/2062)
* Upgraded to `terminus` `2.3.0` [#2082](https://github.com/lando/lando/issues/2082)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.lando.dev/**

## v3.0.0-rrc.1 - [March 22, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-rrc.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Downgraded Docker Desktop for Windows to `2.2.0.3` because [#2052](https://github.com/lando/lando/issues/2052) [#2076](https://github.com/lando/lando/issues/2076)
* Switched pre-release series because apparently linux cares [#2072](https://github.com/lando/lando/issues/2072)
* Updated Docker Desktop for macOS installer to handle the 2.1 -> 2.2 upgrade better

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.lando.dev/**

## v3.0.0-aft.2 - [March 20, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-aft.2)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added support for `mariadb` `10.4` [#2004](https://github.com/lando/lando/issues/2004)
* Added patch version pinning to `bitnami` based services [#2057](https://github.com/lando/lando/issues/2057)
* Added `rsync` to the `php:7.4` image [#2056](https://github.com/lando/lando/issues/2056)
* Fixed bug causing `--secret-toggle` to break packaged `lando`s
* Fixed bug causing prerelease version comparison produce unexpected results [#2049](https://github.com/lando/lando/issues/2049)
* Fixed breaking upstream change in all `bitnami` based services [#2057](https://github.com/lando/lando/issues/2057)

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.lando.dev/**

## v3.0.0-aft.1 - [March 13, 2020](https://github.com/lando/lando/releases/tag/v3.0.0-aft.1)

Lando is **free* * and **open source* * software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added signed `windoze` installer and binary [#2037](https://github.com/lando/lando/issues/2037)
* Added support for `node` `12` and `13` [#1866](https://github.com/lando/lando/issues/1866)
* Added support for new `node` `10` and `11` minor versions [#1981](https://github.com/lando/lando/issues/1981)
* Added support for `php` `7.4` [#1891](https://github.com/lando/lando/pull/1892)
* Added `json` and `table` formats to some `lando` commands [#1737](https://github.com/lando/lando/issues/1737)
* Added compatibility for Docker Desktop `2.2.0.4` on macOS and Windows [#1975](https://github.com/lando/lando/issues/1975)
* Fixed bug causing cli output colorization in non `TTY` contexts [#1789](https://github.com/lando/lando/issues/1789)
* Fixed bug causing `memcached` to not boot up correctly [#1827](https://github.com/lando/lando/issues/1827)
* Improved macOS and Windows Lando installers [#1975](https://github.com/lando/lando/issues/1975)
* Improved build step and restart performance [#2013](https://github.com/lando/lando/issues/2013)
* Rebased `lando` on `node` `12` for MOAR SPEEDS [#2037](https://github.com/lando/lando/issues/2037)
* Removed lingering reference to `Git for Windows` in Windoze installer [#1865](https://github.com/lando/lando/issues/1865)
* Updated to `docker-compose` `1.25.4` [#1975](https://github.com/lando/lando/issues/1975)
* Updated to Docker Desktop `2.2.0.4` for macOS and Windows [#1975](https://github.com/lando/lando/issues/1975)
* Updated `xdebug` to latest in `php` `7.2` and `7.3`
* Updated functional tests to use `hyperdrive 0.6.1` [#2037](https://github.com/lando/lando/issues/2037)

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.lando.dev/**


## v3.0.0-rc.23 - [November 26, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.23)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.lando.dev/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.lando.dev/**

* Added process handling and management to `shell.js`
* Added an opt-in for crash and error reporting
* Added sponsorship options to the website and docs [#0](https://lando.dev/sponsor/)
* Added `The Lando Alliance` to the website [#0](https://lando.dev/alliance/join/)
* Added Catalina support via Notarization [#1829](https://github.com/lando/lando/issues/1829)
* Clarified and updated Terms of Use and Privacy Policy
* Fixed `NET::ERR_CERT_INVALID` on Chrome, may require `lando restart` [#1831](https://github.com/lando/lando/issues/1831)
* Improved anonymity of usage reporting
* Improved `metrics` server
* Updated to Docker Desktop 2.1.0.5

## v3.0.0-rc.22 - [October 7, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.22)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.lando.dev/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Updated to Docker Desktop 2.1.0.2/3 for Catalina prep

## v3.0.0-rc.21 - [October 1, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.21)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed upstream bug with `apache` [#1804](https://github.com/lando/lando/issues/1804)
* Fixed upstream bug with `memcached` [#1804](https://github.com/lando/lando/issues/1804)
* Improved documentation search with Algolia [#1756](https://github.com/lando/lando/issues/1756)

## v3.0.0-rc.20 - [August 16, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.20)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added [marketing site](https://lando.dev) [#1410](https://github.com/lando/lando/issues/1410)
* Added ability to [sponsor lando](https://www.patreon.com/join/devwithlando?)
* Added support for patch versions of `elasticsearch` `7.3` [#1729](https://github.com/lando/lando/issues/1729)
* Fixed `mysql` failing on `linux` on `restart` [#1739](https://github.com/lando/lando/issues/1739)
* Updated to Docker Desktop 2.1.0.1 [#1728](https://github.com/lando/lando/issues/1728)
* Updated to `composer` `1.9.0` for `php` `7.1+`
* Updated [documentation site](https://docs.lando.dev) [#1410](https://github.com/lando/lando/issues/1410)

## v3.0.0-rc.19 - [July 31, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.19)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed critical breaking upstream change that prevented the `mysql` service from restarting [#1718](https://github.com/lando/lando/issues/1718)
* Updated to Docker Desktop `2.1.0.0` and `docker-compose` `1.24.1`

## v3.0.0-rc.18 - [July 17, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.18)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added better functional tests for `postgres` [#1663](https://github.com/lando/lando/issues/1663)
* Added support for `elasticsearch:7` [#1672](https://github.com/lando/lando/issues/1672)
* Fixed borked `elasticsearch` service caused by breaking upstream change in `bitnami/elasticsearch` [#1561](https://github.com/lando/lando/issues/1561) [#1672](https://github.com/lando/lando/issues/1672)
* Fixed borked `mongo` service caused by breaking upstream change in `bitnami/mongodb` [#1674](https://github.com/lando/lando/issues/1674)
* Fixed bug preventing changeds to custom `solr` config from showing up after `lando restart` [#1557](https://github.com/lando/lando/issues/1557)
* Pinned our `php` images to use `stretch` [#1680](https://github.com/lando/lando/issues/1680)
* Updated default `psql` client to match our default `postgres` version `(10)` [#1680](https://github.com/lando/lando/issues/1680)
* Updated `backdrop` `drush` to `1.0.0`

## v3.0.0-rc.17 - [May 24, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.17)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed broken `lando share` command [#1582](https://github.com/lando/lando/issues/1582)
* Fixed breaking upstream change in `apache` service
* Fixed breaking upstream change in `postgres` service [#1612](https://github.com/lando/lando/issues/1612)
* Updated `backdrop` `drush` to `0.1.1`

## v3.0.0-rc.16 - [May 10, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.16)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added a `php` `7.3` appserver container to `pantheon` recipes [#1595](https://github.com/lando/lando/issues/1595)
* Added better feedback after `lando --clear` [#1572](https://github.com/lando/lando/issues/1572)
* Added a duplicate CA Cert ending in `crt` for greater compatibility [#1550](https://github.com/lando/lando/issues/1550)
* Added support for `mariadb` `10.3` [#1603](https://github.com/lando/lando/issues/1603)
* Fixed bug causing custom `engineConfig.certPath` to fail with `ReferenceError: path is not defined` [#1571](https://github.com/lando/lando/issues/1571)
* Fixed bug causing ssh keys to not load if one key had a filename with a space in it [#1593](https://github.com/lando/lando/issues/1593)
* Fixed bug causing Linux installer to fail when `/proc/sys/vm/max_map_count` does not exist [#1586](https://github.com/lando/lando/issues/1586)
* Rebased `php` images on `stretch` where applicable [#1554](https://github.com/lando/lando/issues/1554)
* Suppressed `terminus` update warning [#1551](https://github.com/lando/lando/issues/1551)
* Updated `source` lists for `php` images still running on `jessie` [#1554](https://github.com/lando/lando/issues/1554)
* Updated `drush` defaults to latest versions [#1543](https://github.com/lando/lando/issues/1543)
* Updated `terminus` to version `2.0.1` [#1551](https://github.com/lando/lando/issues/1551)

## v3.0.0-rc.15 - [April 23, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.15)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* This release has no content or changes. It's meant to repopulate S3 assets.

## v3.0.0-rc.14 - [March 18, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.14)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `phantomjs` `1.7.0` to `pantheon` recipes [#1507](https://github.com/lando/lando/issues/1507)
* Documented ability to set custom `vhosts` and `server` config for `php` services and `laempy` recipes [#1523](https://github.com/lando/lando/issues/1523)
* Fixed `mount denied` error on Windows when using hyperdrived directories [#1510](https://github.com/lando/lando/issues/1510)
* Fixed incorrectly set `PYTHONUSERBASE` [#1519](https://github.com/lando/lando/issues/1519)
* Fixed `destroy` events so they actually get loaded on a `lando destroy` [#1531](https://github.com/lando/lando/issues/1531)
* Fixed `pre-rebuild` event [#1531](https://github.com/lando/lando/issues/1531)
* Improved permission handling for hyperdrived directories

## v3.0.0-rc.13 - [March 1, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.13)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added option for `lando info|config|list` etc to be outputted as JSON [#1455](https://github.com/lando/lando/issues/1455)
* Added support for `sport` to `node` services [#1375](https://github.com/lando/lando/issues/1375)
* Added support for `php` `7.3` [#1342](https://github.com/lando/lando/issues/1342)
* Fixed bug causing `~` to not resolve correctly in overridden volumes [#1483](https://github.com/lando/lando/issues/1483)
* Fixed bug causing internal `*_nginx` services to not inherit overrides from their generating services [#1487](https://github.com/lando/lando/issues/1487)
* Fixed regression causing Pantheon Solr `index` service to not boot up correctly [#1491](https://github.com/lando/lando/issues/1491)
* Injected coaxium directly into the hyperdrive motivator [#1460](https://github.com/lando/lando/issues/1460) [#763](https://github.com/lando/lando/issues/763)
* Improved `macOS` uninstaller text to alert user of potential lingering config and containers [#1495](https://github.com/lando/lando/issues/1495)
* Reduced lando logs max file size to something more reasonable
* Updated `composer` to version `1.8.4` [#1375](https://github.com/lando/lando/issues/1375) [#1488](https://github.com/lando/lando/issues/1488)
* Updated `docker` to version `2.0.0.3/18.09.2` [#1375](https://github.com/lando/lando/issues/1375)

## v3.0.0-rc.12 - [February 20, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.12)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `<<` and `>>` to list of `SHELL` auto-wrapped characters in tooling/events/build commands
* Fixed `machine token` persistence for `pantheon` apps that are `git cloned` instead of `lando init` [#1475](https://github.com/lando/lando/issues/1475)
* Fixed regression causing `pantheon` `nginx` config to not load correctly

## v3.0.0-rc.11 - [February 20, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.11)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed critical regression causing default recipe config files not to load correctly [#1478](https://github.com/lando/lando/issues/1478)

## v3.0.0-rc.10 - [February 14, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.10)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Bumped `varnish` `workspace_client` limit to `128k`
* Described URL changes in the upgrade guide [#1445](https://github.com/lando/lando/issues/1445)
* Fixed default database config loading in `LAMPY` recipes [#1454](https://github.com/lando/lando/issues/1454)
* Fixed dynamic tooling routes not setting the correct event service default
* Improved `solr` start up script naming and mounting, _probably_ fixes [#1442](https://github.com/lando/lando/issues/1442)
* Removed unneeded `git` dependency from Linux packages, fixes [#1437](https://github.com/lando/lando/issues/1437)

## v3.0.0-rc.9 - [Febraury 8, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.9)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added support for backdrop drush `0.1.0` release.
* Deprecated `--help` in favor of "smarter" `--help` [#1325](https://github.com/lando/lando/issues/1325)
* Improved `php` `$_ENV` population, fixes [#1429](https://github.com/lando/lando/issues/1429)
* Improved support for `build.context` in `compose` services [#1432](https://github.com/lando/lando/issues/1432)
* Improved `drush` healthcheck to be decoupled from apps [#1325](https://github.com/lando/lando/issues/1325)
* Removed legacy Kalabox code still hanging around, fixes [#1431](https://github.com/lando/lando/issues/1431)

## v3.0.0-rc.8 - [Febraury 7, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.8)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added support to run outside of port `80` for `dotnet` services [#1325](https://github.com/lando/lando/issues/1325)
* Added `lockr` support for `pantheon` recipes [#651](https://github.com/lando/lando/issues/651)
* Fixed schema posting issue on Pantheon Solr `index` service [#1348](https://github.com/lando/lando/issues/1348)
* Fixed regression causing named volumes to not mount properly in `compose` services [#1422](https://github.com/lando/lando/issues/1422)
* Improved `TTY` detection and passthru, fixes [#904](https://github.com/lando/lando/issues/904)

## v3.0.0-rc.7 - [Febraury 6, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.7)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added ability to turn off URL scanning on a per-service level [#1207](https://github.com/lando/lando/issues/1207)
* Added `--all`, `--app` and `--filter` flags to `lando list` [#1325](https://github.com/lando/lando/issues/1325)
* Added `--field` flag for `lando config` [#1325](https://github.com/lando/lando/issues/1325)
* Added support for relative paths to `compose` service [#1415](https://github.com/lando/lando/issues/1415)
* Improved auto `wp search-replace` in `pantheon` recipes [#1409](https://github.com/lando/lando/issues/1409)

## v3.0.0-rc.6 - [Febraury 5, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.6)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed regression causing Pantheon Solr index to incorrectly set user perms [#1405](https://github.com/lando/lando/issues/1405)
* Fixed bug requiring Pantheon Solr index be restarted before schema post [#1325](https://github.com/lando/lando/issues/1325)
* Fixed bug where `--help` and `--version` were routing to lando instead of tooling commands [#1407](https://github.com/lando/lando/issues/1407)
* Fixed regression causing `db-export` to fail on `linux` [#1394](https://github.com/lando/lando/issues/1394)

## v3.0.0-rc.5 - [Febraury 4, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.5)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed regression setting `CACHE_PORT` for `pantheon` recipes [#1396](https://github.com/lando/lando/issues/1396)
* Switched all `bitnami` images to set `LANDO_NEEDS_EXEC`

## v3.0.0-rc.4 - [Febraury 4, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.4)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added support for htaccess overrides for Apache [#999](https://github.com/lando/lando/issues/999)
* Added a `LANDO_HOST_USER` envvar [#1082](https://github.com/lando/lando/issues/1082)
* Changed `ssh` key loading to also load passphrase protected keys by default [#1288](https://github.com/lando/lando/issues/1288) [#1143](https://github.com/lando/lando/issues/1143) [#808](https://github.com/lando/lando/issues/808)
* Changed default `http_resp_hdr_len` for `varnish` to `64000` [#1142](https://github.com/lando/lando/issues/1142)
* Fixed bug where files `rsync`ed from Pantheon were being set to `750` [#1325](https://github.com/lando/lando/issues/1325) [#1067](https://github.com/lando/lando/issues/1067) [#1330](https://github.com/lando/lando/issues/1330)
* Fixed longstanding permissions bug with legacy `solr` version `3.6` [#692](https://github.com/lando/lando/issues/692)
* Fixed bug where not-owned-by-me `.ssh` config was blowing up `ssh` key loading [#1203](https://github.com/lando/lando/issues/1203)
* Fixed bug causing `mysql`, `mariadb` and `postgres` services to intermittently crash on `lando restart` [#1381](https://github.com/lando/lando/issues/1381)
* Fixed regression in `events` caused by "multi word" tooling eg `command [something]`
* Fixed regression in `lando logs --service SERVICE` not actually filtering [#1386](https://github.com/lando/lando/issues/1386)
* Improved `ssh` key loading to use the `LANDO_HOST_USER` by default [#1082](https://github.com/lando/lando/issues/1082)
* Improved handling when an unknown service is used with the `proxy` [#1389](https://github.com/lando/lando/issues/1389)

## v3.0.0-rc.3 - [Febraury 3, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.3)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU READ THE BELOW IF YOU ARE UPDATING FROM PRE RC2**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed `postgres` config loading preventing outside connections [#1379](https://github.com/lando/lando/issues/1379)
* Fixed busted auto-naming on Windows deploy [#1375](https://github.com/lando/lando/issues/1375)
* Fixed busted `drush` global-local handoff on Pantheon [#1375](https://github.com/lando/lando/issues/1375)
* Fixed regression in `LANDO_INFO` causing services to be index values instead of names [#1376](https://github.com/lando/lando/issues/1376)
* Fixed regression causing databases to report as unhealthy after a restart [#1381](https://github.com/lando/lando/issues/1381)
* Improved tooling is-service-already-running delegation [#1378](https://github.com/lando/lando/issues/1378)

## v3.0.0-rc.2 - [Febraury 1, 2019](https://github.com/lando/lando/releases/tag/v3.0.0-rc.2)

### PLEASE PLEASE PLEASE FOR THE LOVE OF ALL THINGS THAT ARE HOLY AND GOOD READ THE BELOW BEFORE PROCEEDING!!!

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU:**

1. [CHECK OUT THE BIG CHANGES](https://thinktandem.io/blog/2019/02/01/lando-is-ready-for-the-masses-with-rc2-release/) IN RC.2!
2. USE [THIS GUIDE](https://docs.devwithlando.io/guides/updating-to-rc2.html) TO UPDATE YOUR LANDOFILES

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `inquirer-autocomplete-prompt` to select inquirer prompts [#1017](https://github.com/lando/lando/issues/1017)
* Added configurable support for `pre` and `post` `.lando.*.yml` source files eg `.lando.[#local|dist].yml` [#759](https://github.com/lando/lando/pulls/759) [#1154](https://github.com/lando/lando/pulls/1154)
* Added support for `elasticsearch` `6` [#1114](https://github.com/lando/lando/pulls/1114)
* Added support for multiple, user-defined `env` files [#994](https://github.com/lando/lando/pulls/994) [#1045](https://github.com/lando/lando/pulls/1045) [#1265](https://github.com/lando/lando/pulls/1265) [#1242](https://github.com/lando/lando/pulls/1242)
* Added support for `ruby` `2.5` [#1068](https://github.com/lando/lando/pulls/1068)
* Added `pcntl` extension to all PHP images [#910](https://github.com/lando/lando/pulls/910)
* Added `leia` to help keep `lando` the real hero we all know he is [#1296](https://github.com/lando/lando/issues/1296)
* Added a better message if users arrive at an "impossible" place [#1158](https://github.com/lando/lando/issues/1158)
* Bumped `xdebug.max_nesting_level` to `512` [#1094](https://github.com/lando/lando/issues/1094)
* Changed `rebuild` events to fire on the outside [#1352](https://github.com/lando/lando/issues/1352)
* Changed `xdebug: false` to actually disable the `php` extension [#760](https://github.com/lando/lando/issues/760)
* Changed update warning to print to `stderr` [#1000](https://github.com/lando/lando/issues/1000)
* Changed `wordpress` recipe to download `wp-cli` version `1.5.1` if using php 5.3 [#1334](https://github.com/lando/lando/issues/1334)
* Changed PHP to have unlimited memory for CLI ops [#732](https://github.com/lando/lando/issues/732)
* Fixed tooling on Windows to not always run as root [#1362](https://github.com/lando/lando/issues/1362)
* Fixed annoying recoverable php error `Cannot set 'user' save handler by ini_set()` on php 7.2 [#747](https://github.com/lando/lando/issues/747)
* Fixed long-standing race condition causing build fail perimission errors on `linux` [#1227](https://github.com/lando/lando/issues/1227) [#1197](https://github.com/lando/lando/issues/1197) [#1170](https://github.com/lando/lando/issues/1170)
* Fixed bug where `docker-compose` files were not loading correctly outside of the app root [#1007](https://github.com/lando/lando/issues/1007)
* Fixed bug where `node` services were not getting the `gid` correctly on `linux` [#1240](https://github.com/lando/lando/issues/1240)
* Fixed bug where cyclical `app -> app` symlink was being create in `pantheon` recipes [#1043](https://github.com/lando/lando/issues/1043)
* Fixed various `solr` config bugs [#1249](https://github.com/lando/lando/issues/1249) [#1350](https://github.com/lando/lando/issues/1350) [#1319](https://github.com/lando/lando/issues/1319) [#1351](https://github.com/lando/lando/issues/1351)
* Increased events `maxListeners` to `64` [#1097](https://github.com/lando/lando/issues/1097)
* Improved `drush` handling, fixes [#1315](https://github.com/lando/lando/issues/1315) [#1317](https://github.com/lando/lando/issues/1317) [#1318](https://github.com/lando/lando/issues/1318)
* Removed `lando` "global options", fixes [#1173](https://github.com/lando/lando/issues/1173)
* Upgraded `terminus` to version `1.9.0` [#1259](https://github.com/lando/lando/issues/1259)
* Upgraded `docker` to version `18.09.0/2.0.0.2` [#1297](https://github.com/lando/lando/issues/1297) [#1316](https://github.com/lando/lando/issues/1316)
* Upgraded `docker-compose` to version `1.23.2` [#1297](https://github.com/lando/lando/issues/1297) [#1316](https://github.com/lando/lando/issues/1316)


## v3.0.0-rc.1 - [September 11, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-rc.1)

**WHILE WE'VE TRIED TO MAINTAIN BACKWARDS COMPATIBILITY WE RECOMMEND YOU [CHECK OUT THE BIG CHANGES](https://docs.devwithlando.io) IN RC! ALSO NOTE THAT THIS VERSION IS STILL IN PRERELEASE WHICH MEANS YOU SHOULD ONLY TRY IT OUT IF YOU ARE FEELING INTREPID**

If you are upgrading from pre-beta.40 follow the [beta.41 release note instructions](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41) If you are on beta.41 or above you can follow the usual JUST-RUN-THE-INSTALLER upgrade process.

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added CA support for custom `proxyDomains` [#998](https://github.com/lando/lando/issues/998)
* Added build steps that can run `before` an app starts [#822](https://github.com/lando/lando/issues/822)
* Added new functional testing toolkit [#1144](https://github.com/lando/lando/issues/1144)
* Added 100% unit test coverage of core libraries [#978](https://github.com/lando/lando/issues/978)
* Added 50% unit test coverage of plugins [#1036](https://github.com/lando/lando/issues/1036)
* Added multi-service and multi-line options for `tooling` [#1036](https://github.com/lando/lando/issues/1036)
* Changed build process to be more stable and reliable [#822](https://github.com/lando/lando/issues/822)
* Changed `restart` to not invoke any build steps [#1064](https://github.com/lando/lando/issues/1064) [#963](https://github.com/lando/lando/issues/963)
* Eliminated technical debt for core libraries [#1036](https://github.com/lando/lando/issues/1036)
* Fixed `freetype` support on `php-5.3-fpm` [#1141](https://github.com/lando/lando/issues/1141)
* Fixed `pre-` event steps [#822](https://github.com/lando/lando/issues/822)
* Fixed various bugs relating to networks and certs [#1071](https://github.com/lando/lando/issues/1071)
* Fixed build steps and events to ensure internal deps are installed first [#1021](https://github.com/lando/lando/issues/1021)
* Reduced technical debt for plugins [#1036](https://github.com/lando/lando/issues/1036)
* Switched code to `es6` [#1036](https://github.com/lando/lando/issues/1036)
* Updated our `examples` to be func testing compatible [#1144](https://github.com/lando/lando/issues/1144)
* Updated to latest Docker deps [#1148](https://github.com/lando/lando/issues/1148)

## v3.0.0-beta.47 - [June 1, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.47)

If you are upgrading from pre-beta.40 follow the [beta.41 release note instructions](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41) If you are on beta.41 or above you can follow the usual JUST-RUN-THE-INSTALLER upgrade process.

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed various show-stopping Windows bugs [#1004](https://github.com/lando/lando/issues/1004)

## v3.0.0-beta.46 - [May 27, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.46)

If you are upgrading from pre-beta.40 follow the [beta.41 release note instructions](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41) If you are on beta.41 or above you can follow the usual JUST-RUN-THE-INSTALLER upgrade process.

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed bug that was throwing `ERROR: The Compose file is invalid...` when `proxy` service changed [#942](https://github.com/lando/lando/issues/942)
* Fixed bug where the `rsync` option was not overrideable for `lando pull` [#982](https://github.com/lando/lando/issues/982)
* Fixed bug where any `--` global options were resetting overriden option defaults [#982](https://github.com/lando/lando/issues/982)
* Fixed bug where `pull` component of `lando rebuild` was ignoring `-s` option [#952](https://github.com/lando/lando/issues/952)
* Fixed bug causing `network XXX not found` error [#990](https://github.com/lando/lando/issues/990)
* Improved `pantheon` pre-run scripting with better perm handling and `$HOME` support [#975](https://github.com/lando/lando/issues/975)
* Improved custom `build` and `volumes` overrides to handle absolute and relative paths [#950](https://github.com/lando/lando/issues/950)

## v3.0.0-beta.45 - [May 16, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.45)

If you are upgrading from pre-beta.40 follow the [beta.41 release note instructions](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41) If you are on beta.41 or above you can follow the usual JUST-RUN-THE-INSTALLER upgrade process.

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `curl` and `php-curl` to `php 5.3` Apache image [#882](https://github.com/lando/lando/issues/882)
* Added support for `postgres` to `lando db-import` and `lando db-export` [#803](https://github.com/lando/lando/issues/803)
* Added support for a `compose` service type. [#933](https://github.com/lando/lando/issues/933)
* Added documentation on using patch versions of images where applicable [#890](https://github.com/lando/lando/issues/890)
* Deprecated `DB_*` and `CACHE_*` environment variables in favor of `LANDO_INFO` [#868](https://github.com/lando/lando/issues/868)
* Fixed bug that prevented usage of overriden `Dockerfiles` [#740](https://github.com/lando/lando/issues/740)
* Improved remote Docker handling [#647](https://github.com/lando/lando/issues/647)
* Improved handling of `mysql` and `pgsql` commands [#803](https://github.com/lando/lando/issues/803)
* Improved detection of non-standard `docker` and `docker-compose` binaries on Linux [#935](https://github.com/lando/lando/issues/935)
* Improved `drush` usage documentation [#580](https://github.com/lando/lando/issues/580)
* Improved `drupal 7/8` image styles when using language code in URL [#914](https://github.com/lando/lando/issues/914)
* Improved `lando ssh` so it honors the current working directory [#895](https://github.com/lando/lando/issues/895)
* Improved `lando ssh` so it fallsback to `sh` if `bash` is not available [#895](https://github.com/lando/lando/issues/895)
* Injected `APP_LOG=errorlog` for Laravel recipes [#958](https://github.com/lando/lando/issues/958)
* Removed legacy `php_value xdebug.remote_autostart 1` being set in the `php` `httpd-ssl.conf` [#886](https://github.com/lando/lando/issues/886)
* Switched `pantheon` `drupal8` sites to globally install `Drush 8` by default [#580](https://github.com/lando/lando/issues/580)
* Moved `prestissimo` from build step to image [#882](https://github.com/lando/lando/issues/882)
* Updated legacy Pantheon API endpoints [#953](https://github.com/lando/lando/issues/953)

## v3.0.0-beta.44 - [May 4, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.44)

**THIS IS A HOTFIX RELEASE DUE TO BREAKING UPSTREAM CHANGES**

If you are upgrading from pre-beta.40 follow the [beta.41 release note instructions](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41) If you are on beta.41 or above you can follow the usual upgrade process.

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed bad id issue interacting with Pantheon API [#943](https://github.com/lando/lando/issues/943)

## v3.0.0-beta.43 - [May 2, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.43)

**THIS IS A HOTFIX RELEASE DUE TO BREAKING UPSTREAM CHANGES**

If you are upgrading from pre-beta.40 follow the [beta.41 release note instructions](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41) If you are on beta.41 or above you can follow the usual upgrade process.

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed nasty bug where user sites were returning "undefined" [#922](https://github.com/lando/lando/issues/922)
* Fixed "Named volume "$LANDO_ENGINE_CONF:/lando:rw" issue [#927](https://github.com/lando/lando/issues/927)

## v3.0.0-beta.42 - [April 30, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.42)

**THIS IS A HOTFIX RELEASE DUE TO BREAKING UPSTREAM CHANGES**

If you are upgrading from pre-beta.40 follow the [beta.41 release note instructions](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41) If you are on beta.41 or above you can follow the usual upgrade process.

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Set default service versions [#908](https://github.com/lando/lando/issues/908)
* Convert interactive name parameters to machine safe [#891](https://github.com/lando/lando/issues/891)

## v3.0.0-beta.41 - [April 30, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.41)

**THIS IS A HOTFIX RELEASE DUE TO BREAKING UPSTREAM CHANGES**

If you are upgrading from pre-beta.40 it is recommended (although possibly not necessary) for you to:

1. Uninstall Docker **(only if you are using Docker for Mac or Docker for Windows)**

**PLEASE NOTE THAT THIS WILL DESTROY ALL YOUR LOCAL APPS!!!**

2. Remove the Lando config directory at `~/.lando`
3. Install the new Lando

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Set default service versions [#908](https://github.com/lando/lando/issues/908)
* Convert interactive name parameters to machine safe [#891](https://github.com/lando/lando/issues/891)

## v3.0.0-beta.40 - [April 8, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.40)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added Arch-based distro pacman package build support [#814](https://github.com/lando/lando/issues/814)
* Added Prestissimo to all PHP services [#62](https://github.com/lando/lando/issues/862)
* Added $LANDO_INFO so every service has information about every other service [#727](https://github.com/lando/lando/issues/727)
* Correct licence used when packaging application
* Fixed bug in app names containing `_|-|.` [#697](https://github.com/lando/lando/issues/697)
* Fixed bug in app names containing uppercase letters [#829](https://github.com/lando/lando/issues/829)
* Fixed various bugs related to database credential overrides [#853](https://github.com/lando/lando/issues/853)
* Fixed various bugs related to `db-import/export` on additional database services [#853](https://github.com/lando/lando/issues/853)
* Signed all container certs with new Lando Local CA [#446](https://github.com/lando/lando/issues/446)
* Updated `terminus` to version `1.8.0` [#848](https://github.com/lando/lando/issues/848)

## v3.0.0-beta.39 - [March 30, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.39)

**WE HIGHLY RECOMMEND YOU UPDATE TO THIS VERSION!!!**

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed bug where `linux` `LANDO_ENGINE_REMOTE_IP` was not set to detected IP
* Updated problematic Docker for Mac 59 to Docker for Mac 60

## v3.0.0-beta.38 - [March 29, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.38)

**WE HIGHLY RECOMMEND YOU UPDATE TO THIS VERSION!!!**

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added better support for internal resolution of `proxy` domains
* Added `COMPOSE_CONVERT_WINDOWS_PATHS` on Windows to help mitigate known Docker for Windows bug [#823](https://github.com/lando/lando/issues/823)
* Changed healthcheck retries to numbers per Compose file format [#796](https://github.com/lando/lando/issues/796)
* Fixed new networking layer to alleviate multi-app-running "weirdness" [#640](https://github.com/lando/lando/issues/640)
* Fixed intermittent permission borking for Linux users using alpine-based services [#795](https://github.com/lando/lando/issues/795)
* Improved `linux` Docker start command handling [#659](https://github.com/lando/lando/issues/659)
* Improved handling and documentation of upload issues on Windows [#396](https://github.com/lando/lando/issues/396)
* Improved and simplified our examples [#798](https://github.com/lando/lando/issues/798) [#801](https://github.com/lando/lando/issues/801)
* Switched to use new `host.docker.internal` for host resolution from container.

## v3.0.0-beta.37 - [March 20, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.37)

**THIS RELEASE CONTAINS SIGNIFICANT CODE REFACTORING TO HELP WITH TESTING. YOU MAY WANT TO HOLD OFF FOR A FEW VERSIONS IF YOU WANT TO BE SUPER SAFE ABOUT THINGS!**

**BUT IF YOU"RE AWESOME AND WANT TO HELP US, USE IT AND BREAK IT AND SUBMIT ISSUES.* * If you do experience any issues try the following corrective action first:

  1. `lando rebuild` any failing apps
  2. `lando destroy` and then `lando start` any failing apps
  3. Restart the docker daemon
  4. Restart your computer
  5. `docker rm -f CONTAINER_ID` any containers throwing errors
  6. Reset the docker daemon to factory defaults (this will blow up all your containers)
  7. Submit an issue to GitHub
  8. Revert to [beta.35](https://github.com/lando/lando/releases/tag/v3.0.0-beta.35) :(

**ALSO, STILL, SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `run` and `run_as_root` as the preferred build step keys [#745](https://github.com/lando/lando/issues/745)
* Added `run_internal` and `run_as_root_internal` for `lando` to use for programmatic build steps [#745](https://github.com/lando/lando/issues/745)
* Added some functional tests to get us moving on testing [#675](https://github.com/lando/lando/issues/675)
* Added legitimate cross-project service networking [#640](https://github.com/lando/lando/issues/640)
* Added `postgresql-client` to `php` images [#717](https://github.com/lando/lando/issues/717)
* Broadened scope of build step re-run to increase start stability [#683](https://github.com/lando/lando/issues/683)
* Changed default interactive `yes/no` prompts to `no` [#669](https://github.com/lando/lando/issues/669)
* Changed `proxy` to be less aggressive on `docker` restarts [#761](https://github.com/lando/lando/issues/761)
* Documented common `.lando.yml` syntax more explicitly [#643](https://github.com/lando/lando/issues/643)
* Finally moved over to all the `eslint` [#620](https://github.com/lando/lando/issues/620)
* Fixed bug where offline mode was failing on metrics check [#630](https://github.com/lando/lando/issues/630)
* Fixed bug where `php 5.3 apache` was not starting correctly [#652](https://github.com/lando/lando/issues/652)
* Fixed GitHub API rate limit bug [#598](https://github.com/lando/lando/issues/598)
* Fixed `postgres` persistent storage and config loading [#39](https://github.com/lando/lando/issues/39)
* Fixed bug where `lando pull` fails to replace wordpress URLs in db [#711](https://github.com/lando/lando/issues/711)
* Improved build step failure UX [#683](https://github.com/lando/lando/issues/683)
* Improved speed of `lando init METHOD` driven `git clone` [#178](https://github.com/lando/lando/issues/178)
* Improved overriding of global config through envvars [#647](https://github.com/lando/lando/issues/647)
* Improved `lando start` so it wait for services that need a `healthcheck` [#677](https://github.com/lando/lando/issues/677)
* Improved default `php` `sendmail` behavior [#756](https://github.com/lando/lando/issues/756)
* Provided some corrective action around `proxy` start failures [#632](https://github.com/lando/lando/issues/632)
* Refactored the code to increase testibility and reduce complexity and dependents [#620](https://github.com/lando/lando/issues/620)
* Removed `disableAutoComposerInstall` and `pantheon` recipe auto `composer install` [#501](https://github.com/lando/lando/issues/501)
* Removed dependency on `grunt` [#639](https://github.com/lando/lando/issues/639)
* Switched to all the `yarn` [#639](https://github.com/lando/lando/issues/639)
* Updated `drush launcher` to version `0.5.1` [#666](https://github.com/lando/lando/issues/666)
* Updated docs to reflect new refactor, dx and governance. [#685](https://github.com/lando/lando/issues/685)
* Updated `terminus` to version `1.7.1`

## v3.0.0-beta.35 - [January 8, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.35)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed bug in URL scanning where no color was specified for caught errors [#627](https://github.com/lando/lando/issues/627)
* Fixed bug in URL scanning where wilcard domains were unintentionally being scanned [#627](https://github.com/lando/lando/issues/627)
* Fixed bug in Windows where custom `php` config file was being mounted with wrong path separator [#625](https://github.com/lando/lando/issues/625)

## v3.0.0-beta.34 - [January 5, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.34)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added ability to disable `lando` provided tooling commands [#472](https://github.com/lando/lando/issues/472)
* Added support for `php` `7.2` to Pantheon recipes
* Added support for wildcard proxy domains [#618](https://github.com/lando/lando/issues/618)
* Fixed bug preventing usage of `--dest` flag in `lando init`s [#584](https://github.com/lando/lando/issues/584)
* Fixed bug where `cli` containers were reporting not existing on first run [#586](https://github.com/lando/lando/issues/586)
* Fixed bug where `cli` containers were not inheriting overrides [#586](https://github.com/lando/lando/issues/586)
* Fixed annoying permissions bug on non-root run services on Linux [#437](https://github.com/lando/lando/issues/437)
* Fixed bug where build steps ignored `-s` flag on `lando rebuild` [#596](https://github.com/lando/lando/issues/596)
* Improved handling of custom `php.ini` files so injection is clearer [#589](https://github.com/lando/lando/issues/589)
* Improved handling of `docker` too-many-networks error [#274](https://github.com/lando/lando/issues/274)

## v3.0.0-beta.33 - [January 4, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.33)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed a bug where Pantheon recipes were erroring on no `solr` user [#611](https://github.com/lando/lando/issues/611)

## v3.0.0-beta.32 - [January 4, 2018](https://github.com/lando/lando/releases/tag/v3.0.0-beta.32)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added some small changes needed by Pantheon Localdev
* Added a Tomcat service [#568](https://github.com/lando/lando/issues/568)
* Added `known_hosts` mapping [#601](https://github.com/lando/lando/issues/601)
* Added support for `php` `7.2` [#578](https://github.com/lando/lando/issues/578)
* Fixed nasty custom `solr` conf bug [#551](https://github.com/lando/lando/issues/551)
* Improved handling of non-standard proxy ports
* Improved feedback to user when the `docker` engine is down [#550](https://github.com/lando/lando/issues/550)


## v3.0.0-beta.31 - [November 26, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.31)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `README`s to our examples [#51](https://github.com/lando/lando/issues/51)
* Give error when trying to run Lando with `sudo` [#545](https://github.com/lando/lando/issues/545)

## v3.0.0-beta.29 - [November 25, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.29)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `drush: false` to Drupaly recipes to turn off Lando `drush` handling [#535](https://github.com/lando/lando/issues/535)
* Added `drush: composer` to Drupaly recipes to install Drush Launcher (good for Drupal 8.4+) [#536](https://github.com/lando/lando/issues/536) [#537](https://github.com/lando/lando/issues/537)
* Added drush: path:/PATH to Drupaly recipes to manually specify the Drush path [#542](https://github.com/lando/lando/issues/542)
* Added `apcu` extension for `php` where applicable [#541](https://github.com/lando/lando/issues/541)
* Added `intl` and `gettext` extensions for `php` [#528](https://github.com/lando/lando/issues/528)
* Udpated base images to `jessie` where applicable [#539](https://github.com/lando/lando/issues/539)

## v3.0.0-beta.28 - [November 23, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.28)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* This release is only intended to verify the new update logic [#430](https://github.com/lando/lando/issues/430)

## 3.0.0-beta.27 - [November 23, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.27)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Signed `macOS` package.
* Improved update considerations [#430](https://github.com/lando/lando/issues/430)

## v3.0.0-beta.26 - [November 20, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.26)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `solr` `6.6`, `7.0`, `7.1` [#513](https://github.com/lando/lando/issues/513)
* Improved `solr` to inject core specific config as well.
* Improved support for `python` [#444](https://github.com/lando/lando/issues/444)
* Persisted `solr` index data through rebuilds [#59](https://github.com/lando/lando/issues/59)

## v3.0.0-beta.25 - [November 16, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.25)

**THIS RELEASE SHOULD AUTOFIX [#497](https://github.com/lando/lando/issues/497) SEE BULLET BELOW FOR DETAIL**

* `Error: EISDIR: illegal operation on a directory, open '/Users/daniel/.lando/services/config/nginx/fastcgi_params'` error.

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `HTTP_USER_AGENT_HTTPS` as an `nginx` server var [#423](https://github.com/lando/lando/issues/423)
* Improved `tmp` directory handling for `pantheon` recipes [#481](https://github.com/lando/lando/issues/481)
* Improved handling of botched script/conf file injection [#497](https://github.com/lando/lando/issues/497)

## v3.0.0-beta.24 - [November 14, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.24)

**HOTFIX RELEASE!!!**

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Fixed missing nginx conf file

## v3.0.0-beta.23 - [November 14, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.23)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added ability to add global envvars through `config.yml` [#479](https://github.com/lando/lando/issues/479)
* Added `disableAutoComposerInstall` settings to allow users to disable auto `composer install` on `pantheon` recipe start ops [#464](https://github.com/lando/lando/issues/464)
* Clarified and standarized docs around loading custom config files for `php-y` things [#410](https://github.com/lando/lando/issues/410)
* Improved handling of `HTTPS` server var for `php` things [#486](https://github.com/lando/lando/issues/486)
* Improved handling of custom `php.ini` files so they override better [#410](https://github.com/lando/lando/issues/410)
* Improved `pantheon.yml` and `pantheon.upstream.yml` handling [#453](https://github.com/lando/lando/issues/453)
* Improved Getting Started docs [#326](https://github.com/lando/lando/issues/326)
* Improved Terminus docs [#454](https://github.com/lando/lando/issues/454)
* Increased THREAT LEVEL of malformed `.lando.yml` files [#457](https://github.com/lando/lando/issues/457)
* Removed the deletion of user configuration files for Lando during un-install on Linux and OSX [#470](https://github.com/lando/lando/issues/470)
* Upgraded `terminus` to `1.6.1` for `pantheon` recipes `lando rebuild` required [#487](https://github.com/lando/lando/issues/487)

## v3.0.0-beta.22 - [October 23, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.22)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added support for `pantheon.upstream.yml` [#425](https://github.com/lando/lando/issues/425)
* Changed default DB and files `lando push` targets to none on Pantheon recipe [#422](https://github.com/lando/lando/issues/422)
* Fixed `drush` compatibility on Backdrop sites using `php 5.3` [#418](https://github.com/lando/lando/issues/418)
* Update Backdrop Drush to `0.0.6`

## v3.0.0-beta.21 - [October 15, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.21)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

**This update contains potentially breaking changes for Windows users!!! Please be mindful of the install prompts.**

* Improved messaging and customization around Windows installer [#398](https://github.com/lando/lando/issues/398)
* Improved `lando pull` for pantheon recipes to not clear caches on live env [#406](https://github.com/lando/lando/issues/406)
* Updated to use new Docker for Windows installer (#thanksdocker) [#405](https://github.com/lando/lando/issues/405)

## v3.0.0-beta.20 - [October 12, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.20)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Added `go` service [#70](https://github.com/lando/lando/issues/70)
* Added `--stdout` flag to `db-export` [#349](https://github.com/lando/lando/issues/349)
* Added ability to pipe data into `db-import` (this is currently finicky) [#349](https://github.com/lando/lando/issues/349)
* Added `memcached` php extension to core php image [#343](https://github.com/lando/lando/issues/343)
* Added `exif` php extension to core php image [#371](https://github.com/lando/lando/issues/371)
* Added info about installed `php` extensions [#343](https://github.com/lando/lando/issues/343)
* Added `--no-wipe` flag to `db-import` to prevent above [#353](https://github.com/lando/lando/issues/353)
* Added documentation on how to use Lando when behind a proxy [#363](https://github.com/lando/lando/issues/363) [#369](https://github.com/lando/lando/issues/369)
* Added machine identifier to Lando-generated ssh keys [#388](https://github.com/lando/lando/issues/388)
* Added global config option `loadPassphraseProtectedKeys` to load passphrase protected keys [#344](https://github.com/lando/lando/issues/344)
* Added Apache Tika to Pantheon recipes [#350](https://github.com/lando/lando/issues/350)
* Switched `db-import` to wipe target DB before import [#353](https://github.com/lando/lando/issues/353)
* Switched Pantheon `lando pull` to purge local DB first before importing remote one [#353](https://github.com/lando/lando/issues/353)
* Switched `drupal8` recipe to install global Drupal Console by default [#381](https://github.com/lando/lando/issues/381)
* Upgraded to `terminus` 1.6.0. [#343](https://github.com/lando/lando/issues/343)
* Fixed bug reporting `manifest for solr:4.10 not found` [#380](https://github.com/lando/lando/issues/380)

## v3.0.0-beta.19 - [October 2, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.19)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Hotfixed regression introduced by [#351](https://github.com/lando/lando/issues/376) that borked `lando` [#376](https://github.com/lando/lando/issues/312)

## v3.0.0-beta.18 - [October 1, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.18)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

* Updated `docs.lndo.io` and `metrics.lndo.io` to `*.devwithlando.io`
* Improved app start to separate `urls` by service [#327](https://github.com/lando/lando/issues/327)
* Switched `lando share` to operate based on `url` instead of `service` [#312](https://github.com/lando/lando/issues/312)
* Provided warning to `macOS` installer regarding Docker installation [#355](https://github.com/lando/lando/issues/355)
* Fixed bug caused by badly formatted `lando share` subdomain [#368](https://github.com/lando/lando/issues/368)
* Fixed bug where `lando CMD` was throwing `arg.match` error when using numbers [#351](https://github.com/lando/lando/issues/351)

## v3.0.0-beta.17 - [September 9, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.17)

**SERIOUSLY, READ THE DOCS!: https://docs.devwithlando.io/**

*  Added ability to run `php` in cli mode [#160](https://github.com/lando/lando/issues/160)
*  Added ability to use `terminus` for `php 5.3` Pantheon apps [#328](https://github.com/lando/lando/issues/328)
*  Added extra check to validate format of injected `ssh` keys [#335](https://github.com/lando/lando/issues/335)
*  Fixed broken `php-fpm 5.3` service [#328](https://github.com/lando/lando/issues/328)

## v3.0.0-beta.16 - [September 5, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.16)

*  Moved from `kalabox` namespace to `lando` namespace.

## v3.0.0-beta.15 - [September 4, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.15)

*  Moved from `kalabox` namespace to `lando` namespace.

## v3.0.0-beta.14 - [September 4, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.14)

**SERIOUSLY, READ THE DOCS: https://docs.devwithlando.io/**

*  Fixed hang when starting Pantheon recipe [#300](https://github.com/lando/lando/issues/300) [#302](https://github.com/lando/lando/issues/302) [#311](https://github.com/lando/lando/issues/311)
*  Fixed issue grabbing files on different branches for Pantheon recipes [#329](https://github.com/lando/lando/issues/329)

## v3.0.0-beta.13 - [September 4, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.13)

**SERIOUSLY, READ THE DOCS: https://docs.devwithlando.io/**

*  Added an `ASP.net` service [#306](https://github.com/lando/lando/issues/306)
*  Added a `MSSQL` service [#320](https://github.com/lando/lando/issues/320)
*  Added `joomla` recipe [#321](https://github.com/lando/lando/issues/321)

## v3.0.0-beta.12 - [September 1, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.12)

**SERIOUSLY, READ THE DOCS: https://docs.devwithlando.io/**

*  Added a `python` service [#69](https://github.com/lando/lando/issues/69)
*  Improved handling of app directories that are deleted before `lando destroy` [#265](https://github.com/lando/lando/issues/265)
*  Pegged `terminus` version in our Dockerfiles to reduce potential of "nasty surprises"
*  Fixed bug where GitHub reported errors were not being checked correctly
*  Fixed "bug" causing SQL imports to fail on single large transactions [#313](https://github.com/lando/lando/issues/313)
*  Fixed bug that required `db-import` dbs to be in same dir as `.lando.yml` [#314](https://github.com/lando/lando/issues/314)

## v3.0.0-beta.11 - [August 27, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.11)

**SERIOUSLY, READ THE DOCS: https://docs.devwithlando.io/**

*  Fixed bug where recipe-set proxy config could not be unset [#295](https://github.com/lando/lando/issues/295)
*  Added `db-export` command and docs. [#292](https://github.com/lando/lando/issues/292)
*  Added new versions to all services where applicable. [#303](https://github.com/lando/lando/issues/303)
*  Added `ruby` service. [#68](https://github.com/lando/lando/issues/68)

## v3.0.0-beta.10 - [August 19, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.10)

### THIS RELEASE CHANGES THE USAGE OF `lando init`

Consult https://docs.devwithlando.io/cli/init.html or run `lando init -- --help` for the usage change.

**ALSO SERIOUSLY, READ THE DOCS: https://docs.devwithlando.io/**

* Changed `name` from an argument to an option in `lando init` [#276](https://github.com/lando/lando/issues/276)
* Changed `pantheon` recipe|method so `lando init` auto-sets the app name [#276](https://github.com/lando/lando/issues/276)
* Changed `github` method so `lando init` auto-sets the app name [#276](https://github.com/lando/lando/issues/276)
* Added support for `.env` file injection [#281](https://github.com/lando/lando/issues/281)
* Added **UNOFFICIAL* * support for `php 7.1` in Pantheon apps [#278](https://github.com/lando/lando/issues/278)
* Added some docs on how to use lando in a ci environment [#147](https://github.com/lando/lando/issues/147) [#149](https://github.com/lando/lando/issues/149)
* Updated `backdrush` version to `0.0.5` for Pantheon apps [#285](https://github.com/lando/lando/issues/285)
* Improved `lando pull` so no files backup degrades to `rsync` [#277](https://github.com/lando/lando/issues/277)
* Improved tooling to support string commands [#282](https://github.com/lando/lando/issues/282)
* Improved bubbling up of correct error code on all `tooling` commands. Helps with things like `travis`
* Improved UX `lando push` and `lando pull` return terminal color to default after message
* Fixed bug where app names with `.` in them were silently failing [#283](https://github.com/lando/lando/issues/283)
* Fixed regression that caused machine token to not be saved correctly.

## v3.0.0-beta.9 - [August 18, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.9)

### THIS RELEASE CHANGES THE USAGE OF `lando init`

Consult https://docs.devwithlando.io/cli/init.html or run `lando init -- --help` for the usage change.

**ALSO SERIOUSLY, READ THE DOCS: https://docs.devwithlando.io/**

* Changed `name` from an argument to an option in `lando init` [#276](https://github.com/lando/lando/issues/276)
* Changed `pantheon` recipe|method so `lando init` auto-sets the app name [#276](https://github.com/lando/lando/issues/276)
* Changed `github` method so `lando init` auto-sets the app name [#276](https://github.com/lando/lando/issues/276)
* Added support for `.env` file injection [#281](https://github.com/lando/lando/issues/281)
* Added **UNOFFICIAL* * support for `php 7.1` in Pantheon apps [#278](https://github.com/lando/lando/issues/278)
* Added some docs on how to use lando in a ci environment [#147](https://github.com/lando/lando/issues/147) [#149](https://github.com/lando/lando/issues/149)
* Updated `backdrush` version to `0.0.5` for Pantheon apps [#285](https://github.com/lando/lando/issues/285)
* Improved `lando pull` so no files backup degrades to `rsync` [#277](https://github.com/lando/lando/issues/277)
* Improved tooling to support string commands [#282](https://github.com/lando/lando/issues/282)
* Improved bubbling up of correct error code on all `tooling` commands. Helps with things like `travis`
* Improved UX `lando push` and `lando pull` return terminal color to default after message
* Fixed bug where app names with `.` in them were silently failing [#283](https://github.com/lando/lando/issues/283)

## v3.0.0-beta.8 - [August 10, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.8)

### THIS RELEASE HAS BREAKING API CHANGES

If you are upgrading and encounter issues try doing a `lando rebuild` on your app. If that does not work try doing a `lando destroy` on your app and then try recreating.

**SERIOUSLY, READ THE DOCS: https://docs.devwithlando.io/**

* Improved `node` service so you have a decoupled `cli` container [#267](https://github.com/lando/lando/issues/267)
* Changed `tooling` to run on the `engine` instead of the `app` level [#267](https://github.com/lando/lando/issues/267)
* Added `needs` options to `tooling` to boot up dependent services [#267](https://github.com/lando/lando/issues/267)
* Moved proxy dashboard to lesser used port `58086`
* Fixed `@cleanurl` fails in `pantheon` nginx config. [#266](https://github.com/lando/lando/issues/266)
* Fixed bug where some simultaneous uses of `proxy` and `init` caused errors [#259](https://github.com/lando/lando/issues/259)
* Fixed bug where `load-keys` was not filtering out non-keys [#268](https://github.com/lando/lando/issues/268)
* Fixed bugs in `lando init` handling
* Fixed bug where `pantheon` machine token was barfing on `lando start` when passed in as option
* Fixed bug where `pantheon` `lando push` was not asking for a message [#260](https://github.com/lando/lando/issues/260)
* Fixed bug where `pantheon` `lando push/pull` was not using the right environments [#261](https://github.com/lando/lando/issues/261)
* Fixed bugs with using `pantheon` site without using `lando init` [#269](https://github.com/lando/lando/issues/269)

## v3.0.0-beta.7 - [August 4, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.7)

* Fixed URL unknowns

## v3.0.0-beta.6 - [August 3, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.6)

* Added `lando switch` command to handle `pantheon` multidev [#241](https://github.com/lando/lando/issues/241)
* Added `interactivity` to `pantheon` utility commands [#249](https://github.com/lando/lando/issues/249)
* Added `hhvm` option to `php` [#67](https://github.com/lando/lando/issues/67)
* Added `mongo` service. [#54](https://github.com/lando/lando/issues/54)
* Added `mean` recipe. [#54](https://github.com/lando/lando/issues/54)

## v3.0.0-beta.5 - [August 2, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.5)

* Made `lando pull` more robust for Pantheon recipes [#240](https://github.com/lando/lando/issues/240)
* Added `lando push` command for `pantheon` recipes [#239](https://github.com/lando/lando/issues/239)
* Fixed brittle remote host determination [#231](https://github.com/lando/lando/issues/231)

## v3.0.0-beta.4 - [August 1, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.4)

* Improved addition of `sudoers` to `docker` group
* Fixed incorrect assertion that `drush alias` does not exist during `lando pull` [#240](https://github.com/lando/lando/issues/240)

## v3.0.0-beta.3 - [July 31, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.3)

* Fixed critical `localtunnel` not found bug.

## v3.0.0-beta.2 - [July 31, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.2)

* Added the `events` framework [#242](https://github.com/lando/lando/issues/242)
* Added a `lando share` command to share your local site publicly [#84](https://github.com/lando/lando/issues/84)
* Fixed build step "merge" to concatenate [#228](https://github.com/lando/lando/issues/228)
* Fixed `lando init` to rebase on preexisting `.lando.yml` [#243](https://github.com/lando/lando/issues/243)

## v3.0.0-beta.1 - [July 30, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-beta.1)

* Updated `GitHub` issue template [#137](https://github.com/lando/lando/issues/137)
* Added option to rebuild specific services on a `lando rebuild` [#223](https://github.com/lando/lando/issues/223)
* Improved cli feedback for unknown commands [#162](https://github.com/lando/lando/issues/162)
* Fixed regresion causing custom `extra_hosts` not to load [#222](https://github.com/lando/lando/issues/222)
* Fixed proxy `extra_hosts` not working on `linux` [#221](https://github.com/lando/lando/issues/221)
* Fixed `xdebug` not working on `linux` [#231](https://github.com/lando/lando/issues/231)

## v3.0.0-alpha.19 - [July 29, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.19)

* Revamped the docs to prep for `beta.1` [#139](https://github.com/lando/lando/issues/139)
* Provided option handling for `tooling` routes [#141](https://github.com/lando/lando/issues/141)
* Added `mysql-import` helper [#140](https://github.com/lando/lando/issues/140)
* Added Pantheon `pull` helper [#142](https://github.com/lando/lando/issues/142)
* Added `pv` to all `php` images [#140](https://github.com/lando/lando/issues/140)
* Removed kalabox legacy `path2bind4u`, should allow non `C:\` drive apps on `Win32`
* Removed kalabox legacy desktop icon on `Win32` [#229](https://github.com/lando/lando/issues/229)
* Switched default `lando ssh` user from `root` to `you`
* Fixed broken `php:5.3-apache` because @uberhacker is the best :)

## v3.0.0-alpha.18 - [July 22, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.18)

* Bumped binary to use `node8`, gives a nice 33% CLI speed improvement
* Removed references to needing to set up shared drives on `win32`, this happens on demand now [#219](https://github.com/lando/lando/issues/219)
* Moved `/usr/local/bin` `chown` setting up the start up stack. [#184](https://github.com/lando/lando/issues/184)
* "Fixed" hyper annoying `exec` hang bug on `win32` with `docker-compose exec` shellout workaround [#181](https://github.com/lando/lando/issues/181)
* "Fixed" read provided better handing for `user 33 doesn't exist` race condition [#184](https://github.com/lando/lando/issues/184)

## v3.0.0-alpha.17 - [July 19, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.17)

* Made sure `/srv/includes/pantheon.sh` is executable.

## v3.0.0-alpha.16 - [July 19, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.16)

* Ensured auto-creation of `/user/.lando/keys`

## v3.0.0-alpha.15 - [July 19, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.15)

* Fixed bug where wrong `LANDO_ENGINE_REMOTE_IP` was borking `extra_hosts` [#129](https://github.com/lando/lando/issues/129)
* Fixed some lingering permissions errors [#129](https://github.com/lando/lando/issues/129) [#163](https://github.com/lando/lando/issues/163) [#177](https://github.com/lando/lando/issues/177)

## v3.0.0-alpha.14 - [July 18, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.14)

* Updated documentation [#130](https://github.com/lando/lando/issues/130)
* Added `mailhog` service [#64](https://github.com/lando/lando/issues/64)
* Added `elasticearch` service [#16](https://github.com/lando/lando/issues/16)
* Added support for php `5.4` [#136](https://github.com/lando/lando/issues/136)
* Added `lando init` docs link [#155](https://github.com/lando/lando/issues/155)
* Switched `hipache` to `traefik` for proxying. [#169](https://github.com/lando/lando/issues/169)
* Fixed bug where services could not `curl` themselves with `proxy` domains eg `*.lndo.site` [#154](https://github.com/lando/lando/issues/154)
* Fixed bug causing directly loaded compose files to fail URL scan. [#169](https://github.com/lando/lando/issues/169)
* Fixed bug where default php version for `pantheon` recipe was delegated to downstream [#132](https://github.com/lando/lando/issues/132)
* Fixed bug where Lando was not delegating `--help` correctly [#131](https://github.com/lando/lando/issues/131)
* Fixed bug where `lando ssh` was not dumping user into `$LANDO_MOUNT` [#159](https://github.com/lando/lando/issues/159)

## v3.0.0-alpha.13 - [June 29, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.13)

* Fixed `util` container scripts to be set to executable
* Fixed regression where `scripts` lost executability
* Fixed bug where `init` method permissions were stopping `ssh-keygen` on `linux`
* Tweaked `init` permission handling on `windoze`
* Fixed persistent cache fail on `windoze`
* Updated `linux` to use `docker-compose` `1.14.0`
* Included `routes.json` in executable
* Fixed bug where `lando init mysite github --recipe pantheon` was not giving Pantheon options
* Removed `unison` file sharing in favor of `osxfs`. Requires `Docker for Mac 17.04+`. [#41](https://github.com/lando/lando/issues/41)
* Added `phpmyadmin` service. [#66](https://github.com/lando/lando/issues/66)
* Fixed bug where multiple DBs on the same app were sharing the same data volume. [#66](https://github.com/lando/lando/issues/66)
* Added undocumented `LANDO_NO_SCRIPTS` envvar to handle alpine containers that cannot handle auto-script running. [#66](https://github.com/lando/lando/issues/66)
* Fixed a bug where not specifying a `site` in the `config` for a `pantheon` recipe would throw an error.
* Improved handling around loading and dumping of YAML files.
* Added auto SSH key forwarding. [#63](https://github.com/lando/lando/issues/63)
* Added `lando init` command. [#110](https://github.com/lando/lando/issues/110)
* Added `pantheon` init method. [#110](https://github.com/lando/lando/issues/110)
* Added `github` init method. [#110](https://github.com/lando/lando/issues/110)

## v3.0.0-alpha.12 - [June 28, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.12)

* Fixed regression where `scripts` lost executability

## v3.0.0-alpha.11 - [June 28, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.11)

* Fixed bug where `init` method permissions were stopping `ssh-keygen` on `linux`
* Tweaked `init` permission handling on `windoze`
* Fixed persistent cache fail on `windoze`

## v3.0.0-alpha.10 - [June 28, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.10)

* Updated `linux` to use `docker-compose` `1.14.0`
* Included `routes.json` in executable
* Fixed bug where `lando init mysite github --recipe pantheon` was not giving Pantheon options

## v3.0.0-alpha.9 - [June 28, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.9)

* Removed `unison` file sharing in favor of `osxfs`. Requires `Docker for Mac 17.04+`. [#41](https://github.com/lando/lando/issues/41)
* Added `phpmyadmin` service. [#66](https://github.com/lando/lando/issues/66)
* Fixed bug where multiple DBs on the same app were sharing the same data volume. [#66](https://github.com/lando/lando/issues/66)
* Added undocumented `LANDO_NO_SCRIPTS` envvar to handle alpine containers that cannot handle auto-script running. [#66](https://github.com/lando/lando/issues/66)
* Fixed a bug where not specifying a `site` in the `config` for a `pantheon` recipe would throw an error.
* Improved handling around loading and dumping of YAML files.
* Added auto SSH key forwarding. [#63](https://github.com/lando/lando/issues/63)
* Added `lando init` command. [#110](https://github.com/lando/lando/issues/110)
* Added `pantheon` init method. [#110](https://github.com/lando/lando/issues/110)
* Added `github` init method. [#110](https://github.com/lando/lando/issues/110)

## v3.0.0-alpha.8 - [June 24, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.8)

* Fixed `pantheon` recipe not sharing `prepend.php` and `pantheon.vcl` correctly.

## v3.0.0-alpha.7 - [June 24, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.7)

* Added `laravel` recipe. [#94](https://github.com/lando/lando/issues/94)
* Added `pantheon` recipe. [#95](https://github.com/lando/lando/issues/95)
* Fixed volume mounting bug that was causing no `css` or `js` to show up on `nginx` on `linux`
* Fixed incorrect `DB_PORT` env for `L{A|E}MP` recipes using `postgres`. [#111](https://github.com/lando/lando/issues/111)

## v3.0.0-alpha.6 - [June 20, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.6)

* Switched from `encloseJS` to `pkg`. [#108](https://github.com/lando/lando/issues/108)
* Added `.gitattributes` to force `LF` checkout of container files. [#108](https://github.com/lando/lando/issues/108)
* Fixed broken `win32` build. [#108](https://github.com/lando/lando/issues/108)

## v3.0.0-alpha.5 - [June 16, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.5)

* Fixed bug where recipe overrides were not being mixed in correctly. [#97](https://github.com/lando/lando/issues/97)
* Fixed bug where `portforward: true` was not showing the actual port given. [#97](https://github.com/lando/lando/issues/97)
* Separated `build` from `extras`. [#91](https://github.com/lando/lando/issues/91)
* Added ability to run arbitrary scripts after services start up. [#93](https://github.com/lando/lando/issues/93)
* Provided some more information for `lando info`. [#75](https://github.com/lando/lando/issues/75)
* Added a `--deep` flag to `lando info`. [#75](https://github.com/lando/lando/issues/75)
* Made `command` usage for `node` services more obvious. [#73](https://github.com/lando/lando/issues/73)
* Added `varnish` service. [#62](https://github.com/lando/lando/issues/62)
* Added `xdebug` options. [#65](https://github.com/lando/lando/issues/65)
* Fixed bug where tooling cmds were dropping path parts in common with `appRoot`. [#104](https://github.com/lando/lando/issues/104)

## v3.0.0-alpha.4 - [June 9, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.4)

* Added a `recipe` layer on top of `services`, `sharing` and `proxy`. [#9](https://github.com/lando/lando/issues/9)
* Increased `maxListeners` for `lando.events`. [#9](https://github.com/lando/lando/issues/9)
* Added `webroot` to `lando info` as applicable.. [#9](https://github.com/lando/lando/issues/9)
* Added a `lamp` recipe. [#79](https://github.com/lando/lando/issues/79)
* Added a `lemp` recipe. [#79](https://github.com/lando/lando/issues/79)
* Added a `drupal6` recipe. [#79](https://github.com/lando/lando/issues/79)
* Added a `drupal7` recipe. [#79](https://github.com/lando/lando/issues/79)
* Added a `backdrop` recipe. [#79](https://github.com/lando/lando/issues/79)
* Added a `wordpress` recipe. [#79](https://github.com/lando/lando/issues/79)
* Added a `drupal8` recipe. [#79](https://github.com/lando/lando/issues/79)
* Updated documentation to include information about recipes. [#79](https://github.com/lando/lando/issues/79)
* Locked down host/container permission mappings. [#83](https://github.com/lando/lando/issues/83)
* Added `wget` and `unzip` to `php` service. [#85](https://github.com/lando/lando/issues/85)
* Fixed bug where `mod_rewrite` was not enabled for the `php` service by default. [#79](https://github.com/lando/lando/issues/79)
* Fixed `linux` perm mapping when `LANDO_ENGINE_UID` already exists. [#85](https://github.com/lando/lando/issues/85)
* Fixed bug where `win32` was incorrectly escaping command spaces. [#85](https://github.com/lando/lando/issues/85)

## v3.0.0-alpha.3 - [June 7, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.3)

* Added API docs. [#48](https://github.com/lando/lando/issues/48)
* Fixed bug where `node` was looking for webserver when in CLI mode. [#61](https://github.com/lando/lando/issues/61)
* Refactored `sharing` to handle webroots better. [#61](https://github.com/lando/lando/issues/61)
* Refactored `sharing` to prep for `osxfs` based sharing mode. [#61](https://github.com/lando/lando/issues/61)
* Updated examples to reflect above. [#61](https://github.com/lando/lando/issues/61)
* Added `memcached` service. [#17](https://github.com/lando/lando/issues/17)
* Added `redis` service. [#14](https://github.com/lando/lando/issues/14)
* Added `lando logs` command. [#56](https://github.com/lando/lando/issues/56)

## v3.0.0-alpha.2 - [June 2, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.2)

* Added a [Backdrop CMS](https://backdropcms.org/) example. [#52](https://github.com/lando/lando/issues/52)
* Added Lando API to documentation [#48](https://github.com/lando/lando/issues/48)
* Added support for [php 7.1](http://php.net/). [#52](https://github.com/lando/lando/issues/52)
* Added [composer](https://getcomposer.org/) to our php containers. [#52](https://github.com/lando/lando/issues/52)
* Added `git` and `ssh` to our php containers. [#52](https://github.com/lando/lando/issues/52)
* Refactored `lando.engine.run` to use `docker exec`. [#52](https://github.com/lando/lando/issues/52)
* Added `extras` section for arbitrary post start build steps. [#52](https://github.com/lando/lando/issues/52)
* Added `composer` section to install global deps for php. [#52](https://github.com/lando/lando/issues/52)
* Added a tooling plugin to handle command routing. [#11](https://github.com/lando/lando/issues/11)
* Added a `lando ssh` command. [#11](https://github.com/lando/lando/issues/11)
* Added a `node` service. [#53](https://github.com/lando/lando/issues/53)
* Fixed a bug where `extras` were not running serially. [#11](https://github.com/lando/lando/issues/11)
* Added a `solr` service. [#15](https://github.com/lando/lando/issues/15)
* Added a `drupal8-composer` example with `solr` support. [#15](https://github.com/lando/lando/issues/15)

## v3.0.0-alpha.1 - [May 24, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.1)

* Initial release of Lando core framework.

## v3.0.0-alpha.0 - [May 23, 2017](https://github.com/lando/lando/releases/tag/v3.0.0-alpha.0)

* Testing release cycle.
