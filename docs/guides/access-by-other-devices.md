---
title: Accessing Lando from Other Devices on Your Local Network
description: Learn how to access your Lando sites from other devices on your network like mobile phones or tablets.
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

# Accessing Lando from Other Devices on Your Local Network

You may want to use another device (e.g., a smartphone or tablet) to test your Lando app.  You can access your lando app easily from another device as follows.

## Changing the Bind

If you would rather test only on your local network and not over the Internet, you first need to change the `bindAddress` to expose your services on the LAN. Note that there are security implications to this and it is not recommended. Please consult the [Security Docs](https://docs.lando.dev/config/security.html).

Once you've done that you can ...

### 1. First, get the IP address of the machine running lando.

#### Windows

Open a command prompt and enter the command `ipconfig /all` and look for the "IPv4 Address" for the network adapter you use to connect to the Internet.  Make sure NOT to use the IP address of the Docker network adapter.  It should be a number like `192.168.0.123`.

#### macOS

Open System Preferences, Network, and then choose the network adapter you are using to connect to the Internet (Ethernet or Wireless).  The local IP address will then be displayed.

#### Linux

Open a command prompt and enter the command `hostname -I | cut -d' ' -f1`.

### 2. Next, get the port of your lando app.

You can do this by running `lando info` from a command prompt and looking for the URL to your site, which should look something like this: `http://localhost:33333`.  In this case, `33333` is the port number.

You can now visit your lando app from other devices by going to `IP address: Port number`.  (Example: `http://192.168.0.123:33333`)
