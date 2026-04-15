# AGENTS.md

Lando is a local development orchestration tool built around Docker, recipes, and plugin-driven automation for app environments and developer tooling. Lando Core (`@lando/core`) is the event-driven Node.js runtime and plugin base behind the `lando` CLI: it bootstraps config, tasks, engine integration, app loading, and built-in plugin behavior.

## Maintenance
- Keep this file up to date. If you identify a serious repo-specific gotcha that is likely to trip future agents, update this file in the same change.

## Commands
- Use `npm`. Node 20 required.
- Full verification: `npm test`. Focused unit test: `npx mocha --timeout 5000 test/<file>.spec.js`.
- Integration tests: `npm run test:leia`. **Do not run locally** — they modify the host system and are CI-only.
- The `.lando.yml` at the project root is solely for docs work (VitePress); it has no relation to app code.

## Architecture
- `bin/lando` — CLI entrypoint/runtime selector.
- `lib/lando.js` — package `main`; owns bootstrap sequencing.
- `index.js` — **not** the library entrypoint; it's the core plugin bootstrap that registers default config and lifecycle hooks.
- Most behavior is wired through events and hook modules, not direct imports. Start with `lib/lando.js`, `app.js`, and `index.js`, then follow `hooks/`.
- Bootstrap levels: `config → tasks → engine → app`. Tooling commands may only reach `engine` if compose cache exists, so not every CLI path initializes a full app.

## Config And Caches
- Landofile loading order (from the app root directory): `.lando.base.yml`, `.lando.dist.yml`, `.lando.recipe.yml`, `.lando.upstream.yml`, `.lando.yml`, `.lando.local.yml`, `.lando.user.yml`.
- CLI relies heavily on task cache and compose cache to decide bootstrap level and available commands.
- If a command change seems ignored, clear caches with `lando --clear` before assuming the code path is wrong.

## TypeScript Migration
- We are incrementally migrating to TypeScript via JSDoc type definitions. Add `@param`, `@return`, `@typedef` to any functions you modify or create.
- Type definitions go in co-located `.types.js` files (e.g., `utils/foo.types.js` next to `utils/foo.js`).
- `npm run typecheck` is not gated in CI. Use `npm run typecheck:full` to include node_modules errors.
- Use standard JSDoc type names (`any`, `number`, etc.) — not `Any`, `Integer`, `Opts`.

## Repo-Specific Gotchas
- **Packaged binary**: adding runtime-loaded files or new top-level directories requires updating `pkg.assets` and `pkg.scripts` in `package.json`, or they'll be missing from the packaged CLI.
- **New source directories** must be added to `jsconfig.json` `include`, `package.json` `nyc.include`, and `package.json` `pkg.scripts`.
- **ESLint**: `require-jsdoc` applies to `FunctionDeclaration` only — arrow functions and expressions do not need JSDoc to pass lint.
- **`examples/**/README.md`** files are executable Leia specs — edits there affect CI test behavior.
