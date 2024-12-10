---
title: Using Lando with Orbstack
description: Learn how to use Lando with Orbstack today.
guide: true

authors:
  - name: Oscar Arzola
    pic: https://avatars.githubusercontent.com/u/4997549?v=4
    link: https://twitter.com/init_sh
updated:
  timestamp: 1733175010
---

# Using Lando with Orbstack

[Orbstack](https://docs.orbstack.dev/) is a lightweight and ⚡️ lightning-fast Docker provider that can serve as a drop-in replacement for Docker Desktop. It is an excellent alternative for users who want to use Lando without Docker Desktop.

> Switching from Docker Desktop is 100% seamless: just open OrbStack and get started.

Official support for swapping Docker providers will be available in [Lando 4](https://lando.dev/blog/2023/01/23/roadmap-of-2023.html). In the meantime, you can use [Orbstack](https://orbstack.dev/) as a drop-in replacement.

After installing Lando, follow these steps:

### 1. Kill all running containers, close Docker Desktop and ensure that auto-start is disabled in Docker Desktop settings.

You can do this by running the following command:

```bash
lando poweroff && docker stop $(docker ps -a -q)
```

### 2. Install Orbstack (You can migrate your existing containers easily; see below).

```bash
brew install orbstack
```

> Lando only checks for the presence of the **Docker.app** client; **it does not require Docker Desktop to be running**. By opening Orbstack, it binds the necessary Docker CLI commands that Lando expects and uses. This allows you to run Lando seamlessly without relying on Docker Desktop.

### 3. Migrating Existing Containers

Orbstack will migrate your containers as soon you do a lando start but if you want to do it manually, and you have existing containers that you want to migrate to Orbstack, run the following command

```bash
orb migrate docker
```

## Additional Commands

### Manually symlink Docker CLI to Orbstack (Optional)

```bash
docker context use orbstack
```

> If you have admin access, OrbStack will automatically update the /var/run/docker.sock symlink to point to its own Docker engine. This improves compatibility with some third-party tools.

More https://docs.orbstack.dev/install#docker-migration

### Reverting to Docker Desktop

If you changed your mind, and you want to unlink Orbstack and use Docker Desktop again, you can do so by running the following command:

```bash
docker context use desktop-linux
```

For more detailed information on how to use Orbstack, please refer to the [Orbstack documentation](https://docs.orbstack.dev/).

Enjoy extreme speed and performance with Orbstack! 🚀
