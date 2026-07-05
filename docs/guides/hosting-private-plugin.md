---
title: Hosting and Distributing a Private Lando Plugin
description: Learn how to build, publish, and distribute a private Lando plugin using a private npm-compatible registry like GitHub Packages.

authors:
  - name: Team Lando
    pic: https://gravatar.com/avatar/c335f31e62b453f747f39a84240b3bbd
    link: https://twitter.com/devwithlando
updated:
  timestamp: 1778457600000

mailchimp:
  # action is required
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  # everything else is optional
  title: Want similar content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# Hosting and Distributing a Private Lando Plugin

This guide walks through publishing a Lando plugin to a private npm-compatible registry and distributing it to developer machines — including how to handle authentication so `lando plugin-add` and automatic update checks both work seamlessly.

[[toc]]

## 1. Choose a Registry

| Option | Best for |
|--------|----------|
| **GitHub Packages** | Orgs already on GitHub — free for private repos with GitHub Enterprise or limited free tier |
| **Verdaccio** | Self-hosted, lightweight, zero cost |
| **Nexus / Artifactory** | Enterprise environments with existing artifact infrastructure |

The instructions below use GitHub Packages (`npm.pkg.github.com`) as the example, but the pattern is identical for other registries — only the registry URL and auth method differ.

## 2. Prepare Your Plugin Package

Your plugin needs three things to be recognized and loaded by Lando.

### package.json

Your `package.json` must have either a `lando` property or `"lando-plugin"` in `keywords`:

```json
{
  "name": "@myorg/my-lando-plugin",
  "version": "1.0.0",
  "keywords": ["lando-plugin"],
  "lando": {},
  "main": "index.js",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

The `@myorg` scope must match your GitHub organization name when using GitHub Packages.

### plugin.yml

Every plugin **must** include a `plugin.yml` at its root. Lando's plugin loader filters out any plugin installed to a path matching `plugins/lando-*` unless this file exists — without it the plugin is silently ignored.

```yaml
name: "@myorg/my-lando-plugin"

api: 3
is-updateable: true
```

### Task file

For this demo, we're going to publish a simple command that outputs `Hello World`. Tasks live in a `tasks/` subdirectory. Each file exports a function that receives the `lando` instance:

```javascript
// tasks/my-command.js
'use strict';

module.exports = lando => ({
  command: 'my-command',
  describe: 'Does something useful',
  usage: '$0 my-command',
  level: 'tasks',
  run: async () => {
    console.log('Hello World');
  },
});
```

### Minimum file structure

```
my-lando-plugin/
├── package.json     # must have "lando": {} or lando-plugin keyword
├── plugin.yml       # required — gates plugin discovery
├── index.js         # minimal: module.exports = async lando => {};
└── tasks/
    └── my-command.js
```

## 3. Publish the Plugin

```bash
# Authenticate as a publisher (needs write:packages scope)
npm login --registry=https://npm.pkg.github.com --scope=@myorg

# Publish
npm publish
```

For CI/CD, use a GitHub Actions token or a service account PAT:

```bash
npm publish --registry=https://npm.pkg.github.com
```

## 4. Distribute Credentials to Developer Machines

Lando reads registry credentials from `~/.lando/plugin-auth.json`. This file uses the same key format as npm's config, translated to JSON:

```json
{
  "@myorg:registry": "https://npm.pkg.github.com",
  "//npm.pkg.github.com/:_authToken": "ghp_TOKENHERE"
}
```

- `@myorg:registry` — tells Lando (via pacote) which registry to use for `@myorg`-scoped packages
- `//npm.pkg.github.com/:_authToken` — the auth token for that registry (nerfdart format)

### Option A: Onboarding script (recommended)

Write a shell script that drops the file, substituting a token from a secret manager or environment variable:

```bash
#!/usr/bin/env bash
# onboard-lando-plugin.sh
# Requires: GITHUB_PACKAGES_TOKEN set in environment or passed as $1

TOKEN="${1:-$GITHUB_PACKAGES_TOKEN}"
LANDO_DIR="${HOME}/.lando"
AUTH_FILE="${LANDO_DIR}/plugin-auth.json"

mkdir -p "$LANDO_DIR"

cat > "$AUTH_FILE" <<EOF
{
  "@myorg:registry": "https://npm.pkg.github.com",
  "//npm.pkg.github.com/:_authToken": "${TOKEN}"
}
EOF

echo "Lando plugin credentials written to ${AUTH_FILE}"

# Install the plugin
lando plugin-add @myorg/my-lando-plugin
```

Distribute the token separately (1Password, Vault, AWS Secrets Manager, etc.) and have developers run:

```bash
GITHUB_PACKAGES_TOKEN=ghp_xxx ./onboard-lando-plugin.sh
```

### Option B: Dotfiles management (Ansible / chezmoi / etc.)

If your org manages developer machines with Ansible or a dotfiles tool, template `~/.lando/plugin-auth.json` the same way you'd manage `.npmrc`.

**Ansible example:**
```yaml
- name: Configure Lando private plugin registry
  copy:
    dest: "{{ ansible_env.HOME }}/.lando/plugin-auth.json"
    content: |
      {
        "@myorg:registry": "https://npm.pkg.github.com",
        "//npm.pkg.github.com/:_authToken": "{{ vault_github_packages_token }}"
      }
    mode: "0600"
```

**chezmoi example** — add `~/.lando/plugin-auth.json.tmpl`:
```json
{
  "@myorg:registry": "https://npm.pkg.github.com",
  "//npm.pkg.github.com/:_authToken": "{{ .githubPackagesToken }}"
}
```

### Option C: `lando plugin-login` (classic npm registries only)

`lando plugin-login` works with registries that support CouchDB-style auth (standard npmjs.org protocol). It does **not** work with GitHub Packages, which only accepts PATs. Use it with Verdaccio or Nexus if those are configured with username/password auth:

```bash
lando plugin-login \
  --username myuser \
  --password "$TOKEN_OR_PASSWORD" \
  --registry https://verdaccio.myorg.internal
```

This writes the resulting session token to `~/.lando/plugin-auth.json` automatically.

## 5. Install the Plugin

Once credentials are in place:

```bash
lando plugin-add @myorg/my-lando-plugin
lando --clear
```

::: tip Clear the cache after installing
The `--clear` flag is required after installing a new plugin to regenerate Lando's task cache. Without it, new commands from the plugin will not appear.
:::

Lando merges `~/.lando/plugin-auth.json` with the command config before calling pacote, so no `--registry` or `--auth` flags are needed at install time.

## 6. Updates

No extra configuration is required for updates. Every time `lando` runs it checks `plugin.check4Update()`, which calls `pacote.packument()` using the same config built from `plugin-auth.json`. As long as credentials are stored, update checks against your private registry happen automatically and developers get the standard update prompt.

## Summary

| Step | Tool / File |
|------|-------------|
| Publish plugin | `npm publish --registry https://npm.pkg.github.com` |
| Store credentials on dev machine | `~/.lando/plugin-auth.json` |
| One-time install | `lando plugin-add @myorg/my-lando-plugin && lando --clear` |
| Ongoing updates | Automatic — no extra steps |
