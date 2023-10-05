Lando Init Remote Source Example
================================

This example exists primarily to test the following documentation:

* [Lando Init with Remote Source](https://docs.lando.dev/cli/init.html#remote-git-repo-or-archive)

Start up tests
--------------

Run the following commands to get up and running with this example.

```bash
# Should clone code down from a remote git repo
mkdir -p git && cd git
lando init --source remote --recipe none --remote-url="git@github.com:lando/lando.git" --yes

# Should extract code from a remote tar file
mkdir -p tar && cd tar
lando init --source remote --recipe none --remote-url="https://github.com/lando/lando/archive/refs/tags/v3.20.2.tar.gz" --remote-options="--strip-components=1" --yes
```

Verification commands
---------------------

Run the following commands to verify things work as expected

```bash
# Should have a landofile in the approot of the git clone
cd git && cat .lando.yml

# Should have a landofile in the approot of thee extracted tar
cd tar && cat .lando.yml
```

Destroy tests
-------------

```bash
# Should remove initialized code
rm -rf git
rm -rf tar
```
