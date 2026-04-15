# AGENTS.md

Lando is a local development orchestration tool built around Docker, recipes, and plugin-driven automation for app environments and developer tooling. Lando Core is the event-driven Node.js runtime and plugin base behind the `lando` CLI: it bootstraps config, tasks, engine integration, app loading, and built-in plugin behavior.

## Maintenance
- If you identify a serious repo-specific gotcha that is likely to trip future agents, update this file in the same change.

## Commands
- Use `npm` in this repo. The lockfile is `package-lock.json`; there is no workspace manager configured.
- Required Node version is `20` (`package.json` engines, `.node-version`, `.tool-versions`).
- Full verification is `npm test`. It runs `npm run lint` first, then `npm run test:unit`.
- Unit tests are Mocha specs under `test/*.spec.js`. For a focused run, use `npx mocha --timeout 5000 test/<file>.spec.js`.
- Coverage for a focused test uses the same tooling as the package script: `npx nyc --reporter=html --reporter=text mocha --timeout 5000 test/<file>.spec.js`.
- Integration tests use Leia via `npm run test:leia`, which executes `leia "examples/**/README.md" -c 'Destroy tests' --stdin`.
- Do not run Leia locally unless the user explicitly asks. The example tests can modify the host system and are intended for CI use.
- Docs are VitePress: `npm run docs:dev`, `npm run docs:build`, `npm run docs:preview`. The repo `.lando.yml` is only for docs work and provisions a `node:18` container for VitePress.

## Architecture
- This is one package, `@lando/core`, even though the repo has directories like `packages/`, `plugins/`, `builders/`, and `sources/`.
- `bin/lando` is the real CLI entrypoint/runtime selector.
- `lib/lando.js` is the package `main` export and owns bootstrap sequencing.
- Root `index.js` is not the main library entrypoint; it is the core plugin bootstrap that registers default config and many lifecycle hooks.
- Most behavior is wired through events and hook modules, not direct imports. Start with `lib/lando.js`, `app.js`, and `index.js`, then follow the `hooks/` modules they register.
- Bootstrap levels are meaningful: `config -> tasks -> engine -> app`. Tooling commands may run with only `engine` bootstrap if compose cache exists, so not every CLI path initializes a full app.

## Config And Caches
- Landofile discovery walks upward from the current directory to the nearest matching app root, then loads companion files from that same directory in this order: `.lando.base.yml`, `.lando.dist.yml`, `.lando.recipe.yml`, `.lando.upstream.yml`, `.lando.yml`, `.lando.local.yml`, `.lando.user.yml`.
- CLI behavior depends heavily on cache files under the user Lando directory. `bin/lando` and `lib/cli.js` use the task cache and compose cache to decide bootstrap level and available commands.
- If a command/task change seems ignored, clear caches with `lando --clear` or remove the relevant cache files before assuming the code path is wrong.

## TypeScript Migration
- Incremental migration via JSDoc type definitions. Add `@param`, `@return`, and `@typedef` annotations to any functions you modify or create.
- Type definitions live in co-located `.types.js` files (e.g., `utils/foo.types.js` next to `utils/foo.js`). Source files import from them via `/** @typedef {import('./foo.types').MyType} MyType */`.
- `jsconfig.json` has `checkJs: true`; `tsc` uses it directly via `--project jsconfig.json`.
- Run `npm run typecheck` locally to track progress (not yet gated in CI). `npm run typecheck:full` includes node_modules errors.
- Do not use non-standard JSDoc type names like `Any`, `Integer`, or `Opts`; use `any`, `number`, and proper `@typedef` definitions instead.

## Repo-Specific Gotchas
- Packaged binary support is explicit. If you add runtime-loaded files or a new top-level code directory, update `package.json` `pkg.assets` and `pkg.scripts` or the packaged CLI can miss them.
- New source directories must be added to `jsconfig.json` `include` (type checking), `package.json` `nyc.include` (coverage), and `package.json` `pkg.scripts` (packaging).
- ESLint uses `eslint-config-google` plus `require-jsdoc` for `FunctionDeclaration` only. Arrow functions and function expressions do not require JSDoc to pass lint.
- `examples/**/README.md` files double as executable Leia specs; changes there can change CI coverage and test behavior.
