---
title: Using Lando with Orbstack
description: Learn how to use Lando with Orbstack today.
guide: true
authors:
  - name: Oscar Arzola
    pic: https://avatars.githubusercontent.com/u/4997549?v=4
    link: https://twitter.com/init_sh
updated:
  timestamp: 1770760290
---

# Using Lando with Orbstack

[Orbstack](https://docs.orbstack.dev/) is a lightweight and ⚡️ lightning-fast Docker provider that can serve as a drop-in replacement for Docker Desktop. It is an excellent alternative for users who want to use Lando without Docker Desktop.

> Switching from Docker Desktop is 100% seamless: just open OrbStack and get started.

Official support for swapping Docker providers will be available in [Lando 4](https://lando.dev/blog/2023/01/23/roadmap-of-2023.html). In the meantime, you can use [Orbstack](https://orbstack.dev/) as a drop-in replacement.

After installing Lando, follow these steps:

## 1. Kill all running containers and close Docker Desktop

Ensure that auto-start is disabled in Docker Desktop settings. You can stop all containers by running:

```bash
lando poweroff && docker stop $(docker ps -a -q)
```

## 2. Install Orbstack

```bash
brew install orbstack
```

## 3. Create a symbolic link for Docker.app (if needed)

Lando checks for the presence of **Docker.app**, but doesn't actually require Docker Desktop to be installed or running. If you want to completely remove Docker Desktop, you can create a symbolic link from Orbstack to Docker.app:

```bash
sudo ln -s /Applications/OrbStack.app /Applications/Docker.app
```

This tricks Lando into thinking Docker.app is present, while Orbstack handles all the Docker CLI commands seamlessly.

> **Note:** By opening Orbstack, it binds the necessary Docker CLI commands that Lando expects and uses. This allows you to run Lando without relying on Docker Desktop.

## 4. Migrating Existing Containers

Orbstack will automatically migrate your containers the first time you run `lando start`. If you prefer to migrate manually, run:

```bash
orb migrate docker
```

## Additional Commands

### Manually symlink Docker CLI to Orbstack (Optional)

```bash
docker context use orbstack
```

> If you have admin access, OrbStack will automatically update the `/var/run/docker.sock` symlink to point to its own Docker engine. This improves compatibility with some third-party tools.

More info: https://docs.orbstack.dev/install#docker-migration

### Reverting to Docker Desktop

If you want to switch back to Docker Desktop, run:

```bash
docker context use desktop-linux
```

For more detailed information on how to use Orbstack, please refer to the [Orbstack documentation](https://docs.orbstack.dev/).

Enjoy extreme speed and performance with Orbstack! 🚀
