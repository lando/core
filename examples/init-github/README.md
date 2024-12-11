# Lando Init GitHub Source Example

This example exists primarily to test the following documentation:

* [Lando Init with GitHub Source](https://docs.lando.dev/cli/init.html#github)

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should clone code down from GitHub
mkdir -p github && cd github
rm -rf ~/.lando/scripts
lando init --source github --recipe none --github-auth="$GITHUB_PAT" --github-repo="git@github.com:lando/lando.git" --github-key-name="$GITHUB_KEY_NAME" --yes
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should have the README.md in the approot
cd github && cat README.md

# Should merge default init values into config
cd github && cat .lando.yml | grep something | grep happening-here
```

## Destroy tests

```bash
# Should remove key
docker run --rm -v "$(pwd)":/data -w /data badouralix/curl-jq:alpine sh -c "/data/remove-key.sh $GITHUB_PAT $GITHUB_KEY_NAME"

# Should remove initialized code
rm -rf github
```
