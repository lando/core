# AGENTS.md

## Leia Specs
- Each example directory's `README.md` is an executable Leia integration spec, not just documentation.
- Keep the `README.md` sections structured as runnable test phases, especially `Start up tests`, `Verification commands`, and `Destroy tests`; `npm run test:leia` targets the `Destroy tests` section.
- Treat example changes as potentially host-mutating integration changes: commands here can start containers, alter Docker state, write files, and remove local resources.
- Do not run these example tests locally unless the user explicitly asks. They are intended for CI.

## When Editing Examples
- If you change example behavior, update the corresponding `README.md` commands in the same directory so the executable spec still matches reality.
- If you add, remove, rename, or re-scope example specs, update the matching GitHub Actions workflow entries too: `.github/workflows/pr-core-tests.yml`, `.github/workflows/pr-setup-linux-tests.yml`, `.github/workflows/pr-setup-windows-tests.yml`, and `.github/workflows/pr-setup-macos-tests.yml`.
- Root `examples/.lando.yml` loads `@lando/core` from `..`; examples are wired to exercise this checkout, not an installed release.
