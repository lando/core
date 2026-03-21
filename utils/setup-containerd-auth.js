'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Known Docker credential helper binaries.
 *
 * These are the `credsStore` / `credHelpers` values that may appear in a
 * Docker config.json. finch-daemon and docker-compose support the same
 * credential helper protocol, so we just need to verify the helper binary
 * is available on `$PATH`.
 *
 * @type {string[]}
 * @private
 */
const KNOWN_CRED_HELPERS = [
  'docker-credential-osxkeychain',
  'docker-credential-desktop',
  'docker-credential-ecr-login',
  'docker-credential-gcloud',
  'docker-credential-pass',
  'docker-credential-secretservice',
  'docker-credential-wincred',
];

/**
 * Resolve the path to the Docker config directory.
 *
 * Checks (in order):
 * 1. Explicit `configPath` option (override)
 * 2. `DOCKER_CONFIG` environment variable
 * 3. Default `~/.docker`
 *
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.configPath] - Explicit path to the Docker config *directory*.
 * @param {Object} [opts.env] - Environment variables to inspect (default: `process.env`).
 * @returns {string} Absolute path to the Docker config directory.
 */
const getDockerConfigPath = (opts = {}) => {
  if (opts.configPath) return path.resolve(opts.configPath);
  const env = opts.env || process.env;
  if (env.DOCKER_CONFIG) return path.resolve(env.DOCKER_CONFIG);
  return path.join(os.homedir(), '.docker');
};

/**
 * Detect credential helpers referenced in a Docker config.json.
 *
 * Reads the `credsStore` and `credHelpers` fields and returns a list of
 * unique helper binary names (e.g. `docker-credential-osxkeychain`).
 *
 * @param {Object} configJson - Parsed contents of `config.json`.
 * @returns {string[]} Unique credential helper binary names found in the config.
 * @private
 */
const detectCredentialHelpers = configJson => {
  const helpers = new Set();

  // credsStore — global credential store
  if (configJson.credsStore) {
    helpers.add(`docker-credential-${configJson.credsStore}`);
  }

  // credHelpers — per-registry credential helpers
  if (configJson.credHelpers && typeof configJson.credHelpers === 'object') {
    for (const helper of Object.values(configJson.credHelpers)) {
      helpers.add(`docker-credential-${helper}`);
    }
  }

  return Array.from(helpers);
};

/**
 * Build the auth configuration for the containerd backend.
 *
 * finch-daemon and docker-compose read `~/.docker/config.json` natively for
 * registry authentication, using the same format and credential helpers as
 * Docker. This function:
 *
 * 1. Locates the Docker config directory (respects `DOCKER_CONFIG` env var).
 * 2. Reads and parses `config.json` if it exists.
 * 3. Detects any credential helpers referenced in the config.
 * 4. Returns the config path and environment variables to inject into
 *    docker-compose/Dockerode commands so that auth "just works" with
 *    Lando's isolated containerd.
 *
 * @param {Object} [opts={}] - Configuration options.
 * @param {string} [opts.configPath] - Explicit Docker config directory override.
 *   When set, `DOCKER_CONFIG` will be injected into the returned env so
 *   docker-compose/Dockerode finds it. When `null`/`undefined`, the default
 *   `~/.docker` is used and no extra env is needed.
 * @param {Object} [opts.env] - Environment variables to inspect (default: `process.env`).
 * @param {boolean} [opts.debug] - Reserved for future debug logging support.
 * @returns {{dockerConfig: string, env: Object, configExists: boolean, credentialHelpers: string[]}}
 *   - `dockerConfig` — absolute path to the Docker config *directory*.
 *   - `env` — environment variables to inject (e.g. `{DOCKER_CONFIG: '...'}`).
 *     Empty object when the default path is used.
 *   - `configExists` — whether `config.json` was found in the directory.
 *   - `credentialHelpers` — credential helper binaries referenced in the config.
 *
 * @since 4.0.0
 * @example
 * const {getContainerdAuthConfig} = require('../utils/setup-containerd-auth');
 * const auth = getContainerdAuthConfig();
 * // auth.env → {} (default path, no override needed)
 * // auth.configExists → true
 * // auth.credentialHelpers → ['docker-credential-osxkeychain']
 *
 * @example
 * const auth = getContainerdAuthConfig({configPath: '/custom/docker'});
 * // auth.env → {DOCKER_CONFIG: '/custom/docker'}
 */
const getContainerdAuthConfig = (opts = {}) => {
  const configDir = getDockerConfigPath(opts);
  const configFile = path.join(configDir, 'config.json');

  // Determine whether we need to set DOCKER_CONFIG.
  // docker-compose uses ~/.docker by default — we only need to override when
  // the config lives somewhere non-standard.
  const defaultDir = path.join(os.homedir(), '.docker');
  const isNonStandardPath = path.resolve(configDir) !== path.resolve(defaultDir);

  const env = {};
  if (isNonStandardPath) {
    env.DOCKER_CONFIG = configDir;
  }

  // Attempt to read config.json
  let configExists = false;
  let credentialHelpers = [];

  try {
    if (fs.existsSync(configFile)) {
      configExists = true;
      const raw = fs.readFileSync(configFile, 'utf8');
      const configJson = JSON.parse(raw);
      credentialHelpers = detectCredentialHelpers(configJson);

      // Check if credsStore references a non-existent helper binary (e.g. desktop.exe on WSL).
      // If so, create a sanitized config without it and redirect DOCKER_CONFIG.
      if (configJson.credsStore) {
        // finch-daemon treats credential helper errors as fatal (unlike Docker
        // which falls back to anonymous). On WSL, desktop.exe helper exists but
        // fails for registries without stored credentials. Always sanitize.
        {
          // Create a sanitized config without the broken credsStore
          const sanitizedDir = path.join(os.homedir(), '.lando', 'docker-config');
          fs.mkdirSync(sanitizedDir, {recursive: true});
          const sanitized = {...configJson};
          delete sanitized.credsStore;
          fs.writeFileSync(path.join(sanitizedDir, 'config.json'), JSON.stringify(sanitized, null, 2), 'utf8');
          env.DOCKER_CONFIG = sanitizedDir;
        }
      }
    }
  } catch {
    // If we can't read or parse the config, that's fine — finch-daemon will
    // simply operate without auth, which is correct for public images.
    configExists = false;
    credentialHelpers = [];
  }

  return {
    dockerConfig: configDir,
    env,
    configExists,
    credentialHelpers,
  };
};

module.exports = {getContainerdAuthConfig, getDockerConfigPath};
