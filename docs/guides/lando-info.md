---
title: Using $LANDO_INFO
description: Learn how to use Lando's default environment variables inside you application.
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

# Using $LANDO_INFO

Lando will inject an environment variable called `$LANDO_INFO` into each service. This is a `JSON` string representation of the `lando info` command and you can use it to see valuable information about other services such as service hostnames and database connection information and credentials.

This is helpful if you want to set application configuration in a way that is portable and dynamic between many lando apps.

::: warning Use `internal_connection` information!
For services with both `external_connection` and `internal_connection` information. ALWAYS use the `internal_connection` information inside of your application.
:::

Here are some examples of code on how to parse `$LANDO_INFO`.

## Using PHP

```php
$info = json_decode(getenv('LANDO_INFO'), TRUE);
print_r($info);
```

## Using Javascript/NodeJS

```js
'use strict';

var info = JSON.parse(process.env.LANDO_INFO);

console.log(info);
```

## Using Other

More examples coming soon but in the meantime consult the documentation for your language on how to:

* Grab an environment variable
* Decode a JSON string to an object
