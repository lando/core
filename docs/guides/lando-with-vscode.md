---
title: Using Lando with VSCode
description: Learn how to configure xdebug in Lando using VSCode.
guide: true

authors:
  - name: Team Lando
    pic: https://gravatar.com/avatar/c335f31e62b453f747f39a84240b3bbd
    link: https://twitter.com/devwithlando
updated:
  timestamp: 1684248136000

mailchimp:
  # action is required
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  # everything else is optional
  title: Want similar content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# Using Lando with VSCode

[Visual Studio Code](https://github.com/Microsoft/vscode/) is a great open source editor for programming. Debugging PHP applications with it can be easy too.

This is a basic setup to help you in this task.

For a complete explaination of the Xdebug features and configuration options available to you in Lando see the
[Using Xdebug](https://docs.lando.dev/php/config.html#using-xdebug) section of Lando's PHP plugin documentation.

[[toc]]

## Getting Started

Enable Xdebug by adding the `xdebug: true` line to your `.lando.yml`.

When using a recipe, add it under the `config` key:
```yaml
name: mywebsite
recipe: drupal10
config:
  xdebug: true
```

Otherwise, override your php service, usually named `appserver`:
```yaml
name: mywebsite
services:
  appserver:
    webroot: web
    xdebug: true
```

Rebuild your environment.

```bash
lando rebuild -y
```

Finally, create a custom `launch.json` file in your workspace in order to map paths so that XDebug works correctly.

```bash
touch .vscode/launch.json
code .vscode/launch.json
```

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for XDebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/app/": "${workspaceFolder}/",
      }
    }
  ]
}
```

**Note: PHP 7.1 and earlier uses xdebug 2** which uses port 9000, so change the port number above accordingly.

Done!

You can now click start debugging (type F5 or click on the icon in the left sidebar).

## Advanced Setup

Optionally for better performance you can easily toggle Xdebug on and off with some custom tooling commands.

If you're using Apache, add this to your `.lando.yml`:

```yaml
config:
  # Set Xdebug off by default. We use the tooling below to turn it on as needed.
  xdebug: false

services:
  appserver:
    overrides:
      environment:
        XDEBUG_MODE: 'debug,develop'

tooling:
  xdebug-on:
    service: appserver
    description: Enable Xdebug.
    user: root
    cmd:
      - docker-php-ext-enable xdebug && kill -USR2 $(pgrep -o php-fpm) > /dev/null || /etc/init.d/apache2 reload
      - tput setaf 2 && echo "Xdebug On" && tput sgr 0 && echo

  xdebug-off:
    service: appserver
    description: Disable Xdebug.
    user: root
    cmd:
      - rm /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && kill -USR2 $(pgrep -o php-fpm) > /dev/null || /etc/init.d/apache2 reload
      - tput setaf 1 && echo "Xdebug Off" && tput sgr 0 && echo
```

Now you can turn Xdebug on or off with `lando xdebug-on` and `lando xdebug-off`.

## Debugging PhpUnit

Debugging PhpUnit tests in VSCode requires a little more setup, but Lando helps to make it easier.

First, you need to have VSCode listen for debugging on 2 separate ports, because PhpUnit runs in one process and the tests themselves in another, and VSCode's Xdebug extension currently struggles with this. You accomplish this by have a launch.json that looks like this:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for XDebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "log": true,
      "pathMappings": {
        "/app/": "${workspaceFolder}/",
      }
    },
    {
      "name": "PhpUnit dummy",
      "type": "php",
      "request": "launch",
      "port": 9001,
    }
  ],
  "compounds": [
    {
        "name": "PhpUnit",
        "configurations": ["Listen for XDebug", "PhpUnit dummy"]
    }
       ]
}
```

Next add some custom tooling to your .lando.yml file, that provides a command to run PhpUnit in a way points the main PhpUnit process to the PhpUnit dummy debugger we just added. (The syntax here assumes a project-specific installation of PhpUnit, not a global one).

```yml
tooling:
  phpunitdebug:
    service: appserver
    cmd: php -d xdebug.remote_port=9003 vendor/bin/phpunit
```

**Note: PHP 7.1 and earlier uses xdebug 2** which uses port 9000, so change the port number above accordinly.

Now to run debug a PhpUnit test, do the following:

1. Select the compound "PhpUnit" as your debugger in VSCode's UI, and start it.
2. Make sure you untick "Everything" in the breakpoints section of the UI, or it will break every time PhpUnit throws an exception, even if it's properly caught by PhpUnit.
3. Add a breakpoint in your code that is being tested.
4. On your command line run PhpUnit with something like `lando phpunitdebug --filter=testMyTestMethodName` (this example is of running a single test method, actually you can add any phpunit options you like at the end).

## Known issues

**Xdebug session doesn't start**

If Xdebug session doesn't start, dig into the log file inside the application.

Enter the app with `lando ssh` and open the debug file (`/tmp/xdebug.log`).

Path to the debug file is configured in your custom `php.ini`.

Now open your app in a browser and see what's being logged.

```bash
lando ssh
tail -f /tmp/xdebug.log
# Open your browser and refresh the app
```

**Xdebug says "timeout trying to connect to XX.XX.XX:9003**

Double-check your host machine allow connection on its port 9003.

This is how you can open a specific port on a Debian/Ubuntu:

`sudo iptables -A INPUT -p tcp -d 0/0 -s 0/0 --dport 9003 -j ACCEPT`

## Read More

*   [Original Gist with settings for XDebug in VSCode](https://gist.github.com/MatthieuScarset/0c3860def9ff1f0b84e32f618c740655)
*   [PHP programming in VSCode](https://code.visualstudio.com/docs/languages/php)
