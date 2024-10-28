---
title: lando init
description: lando init is a powerful command that initializes a codebase for usage with a Lando recipe, it can pull code from Pantheon, GitHub and other remote sources.
---

# lando init

Fetches code and/or initializes a Landofile for use with lando.

This is a poorly designed command that does two main things:

* Initializes a `.lando.yml` for a given `recipe`
* Grabs code from various `sources`

It can also be extended by [plugins](https://docs.lando.dev/plugins) but this page it purely for the core `lando init` which admittedly does not do much. We are aiming to redesign this command in Lando 4 so please bear with us until then.

If you are looking to `lando init` your code for a particular use case eg `drupal` we recommend checking out the plugin docs for that use case instead of these ones. For your convenience here are some common plugins that implement `lando init`:

* [Acquia](https://docs.lando.dev/plugins/acquia/)
* [Backdrop](https://docs.lando.dev/plugins/backdrop/)
* [Drupal](https://docs.lando.dev/plugins/drupal/)
* [Joomla](https://docs.lando.dev/plugins/joomla/)
* [Lagoon](https://docs.lando.dev/plugins/lagoon/)
* [LAMP](https://docs.lando.dev/plugins/lamp/)
* [Laravel](https://docs.lando.dev/plugins/laravel/)
* [LEMP](https://docs.lando.dev/plugins/lemp/)
* [Pantheon](https://docs.lando.dev/plugins/pantheon/)
* [Symfony](https://docs.lando.dev/plugins/symfony/)
* [WordPress](https://docs.lando.dev/plugins/wordpress/)

## Usage

```sh
  lando init
    [--name <name>]
    [--recipe <recipe>]
    [--source <source>]
    [--full]
    [--github-auth==<token>]
    [--github-repo==<url>]
    [--option=<path=value>...]
    [--remote-options=<options>]
    [--remote-url=<url>]
    [--webroot=<path>]
    [--yes]
    [--other-plugin-provided-options...]
```

### Sources

#### Current Working Directory

By default Lando will use the code from the directory you are currently in. Nothing much special here, just navigate to the directory with your code and invoke `lando init`.

```sh
lando init --source cwd
```

#### Remote git repo or archive

You can also tell Lando to either clone code from a remote Git repo or extract code from a remote tar archive. Note that if you clone from a git repo it is up to the user to make sure any relevant ssh keys are set up correctly.

```sh
# Let Lando walk you through it
lando init --source remote

# Get Drupal 9 from GitHub
lando init --source remote --remote-url https://github.com/drupal/drupal.git

# Get Drupal 9 from an archive
lando init --source remote --remote-url https://www.drupal.org/download-latest/tar.gz
```

Note that you can also pass in options to alter the behavior of the clone or archive extraction

```sh
# Shallow clone and checkout the 7.x branch
# NOTE: you currently need to use the = below in `--remote-options` for yargs to parse this correctly
lando init \
  --source remote \
  --remote-url https://github.com/drupal/drupal.git \
  --remote-options="--branch 7.x --depth 1"

# Strip the leading component of the tar
# NOTE: you currently need to use the = below in `--remote-options` for yargs to parse this correctly
lando init \
  --source remote \
  --remote-url https://www.drupal.org/download-latest/tar.gz \
  --remote-options="--strip-components=1"
```

#### GitHub

In order to pull down code from GitHub you will need to make sure you have created a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and that it has the `repo`, `admin:public_key` and `user` scopes.

Note that Lando will automatically create and post a SSH key to GitHub for you if you use this init source.

```sh
# Let Lando walk you through it
lando init --source github

# Pull git@github.com:lando/lando.git from GitHub and set it up as a pantheon recipe
lando init \
  --source github \
  --github-auth "$MY_GITHUB_TOKEN" \
  --github-repo git@github.com:lando/lando.git

# Pull code from github and set it up with no recipe
lando init \
  --source github \
  --recipe none \
  --github-auth "$MY_GITHUB_TOKEN" \
  --github-repo git@github.com:lando/lando.git \
  --name lando
```

## Options

Run `lando init --help` to get a complete list of options defaults, choices, recipes, sources etc as these may differ based on plugins you have installed.

```sh
--channel         Sets the update channel                                                           [array] [choices: "edge", "none", "stable"]
--clear           Clears the lando tasks cache                                                                                        [boolean]
--debug           Shows debug output                                                                                                  [boolean]
--help            Shows lando or delegated command help if applicable                                                                 [boolean]
--verbose, -v     Runs with extra verbosity                                                                                             [count]
--full            Dump a lower level lando file                                                                      [boolean] [default: false]
--github-auth     Uses a GitHub personal access token                                                                                  [string]
--github-repo     Uses the GitHub git url                                                                                              [string]
--name            The name of the app                                                                                                  [string]
--option, -o      Merge additional KEY=VALUE pairs into your recipes config                                                             [array]
--recipe, -r      The recipe with which to initialize the app                                                        [string] [choices: "none"]
--remote-options  Passes options into either the git clone or archive extract command                                    [string] [default: ""]
--remote-url      Uses the URL of your git repo or archive, only works when you set source to remote                                   [string]
--source, --src   The location of your apps code                                                  [string] [choices: "cwd", "github", "remote"]
--webroot         Specify the webroot relative to app root                                                                             [string]
--yes, -y         Auto answer yes to prompts                                                                         [boolean] [default: false]
```

## Examples

Note that some of these examples assume the needed plugins have been installed.

```sh
# Interactively instantiate your code for use with lando
lando init

# Spit out a full Drupal 7 Landofile using code from your current working directory
lando init --source cwd --recipe drupal7 --name d7-hotsauce --webroot . --full

# Pull code from GitHub and set it up as a mean recipe
lando init \
  --source github \
  --recipe mean \
  --github-auth "$MY_GITHUB_TOKEN" \
  --github-repo git@github.com:lando/lando.git \
  --name my-awesome-app

# Interactively pull a site from pantheon
lando init --source pantheon

# Set up a pantheon site but use code from a custom git repo
lando init --source remote --remote-url https://my.git.repo/.git --recipe pantheon

# Set up a local repo with the pantheon recipe
lando init --recipe pantheon

# Set up a mean recipe that runs on a particular port with a particular command
lando init --source cwd \
  --recipe mean \
  --option port=3000 \
  --option command="npm run watch" \
  --name meanest-app-youve-ever-seen

# Pull the latest Drupal 7 and set up drupal7 config to use mariadb instead of mysql
lando init \
  --source remote \
  --remote-url https://ftp.drupal.org/files/projects/drupal-7.71.tar.gz \
  --remote-options="--strip-components 1" \
  --recipe drupal7 \
  --webroot . \
  --option database=mariadb \
  --name my-first-drupal7-app
```
