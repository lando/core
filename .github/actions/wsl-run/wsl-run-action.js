/**
 * GitHub action to run other actions in WSL environment
 * @param {string} uses - Name of GitHub action to run (e.g. 'actions/checkout@v4')
 * @param {string} with - Input parameters to pass to the action in key=value format, supporting =, :, and = delimiters
 * @param {string} run - Commands to run in WSL bash shell
 * @return {Promise<void>} Promise that resolves when action completes
 */
const core = require('@actions/core');
const exec = require('@actions/exec');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Define WSL environment variables once at the top level
const baseWslEnv = [
  'GITHUB_WORKSPACE/p',
  'GITHUB_ACTION',
  'GITHUB_ACTIONS', 
  'GITHUB_ACTOR',
  'GITHUB_REPOSITORY',
  'GITHUB_EVENT_NAME',
  'GITHUB_EVENT_PATH/p',
  'GITHUB_SHA',
  'GITHUB_REF',
  'GITHUB_TOKEN',
  'GITHUB_RUN_ID',
  'GITHUB_RUN_NUMBER',
  'RUNNER_OS',
  'RUNNER_TEMP/p',
  'RUNNER_TOOL_CACHE/p',
  'CI',
  'GITHUB_DEBUG',
  'ACTIONS_RUNNER_DEBUG',
  'ACTIONS_STEP_DEBUG'
];

async function run() {
  try {
    // Get action inputs
    const uses = core.getInput('uses');
    const withInputs = core.getInput('with');
    const runCommand = core.getInput('run');

    // Validate inputs
    if (runCommand && (uses || withInputs)) {
      throw new Error('The "run" input cannot be used together with "uses" or "with" inputs');
    }

    if (!runCommand && !uses) {
      throw new Error('Either "run" or "uses" input must be provided');
    }

    // If run command is provided, execute it directly in WSL
    if (runCommand) {
      core.info('Running command in WSL environment');
      core.debug(`Command: ${runCommand}`);

      // Set up basic environment variables for WSL
      const wslEnv = baseWslEnv.join(':');

      process.env.WSLENV = process.env.WSLENV ? `${process.env.WSLENV}:${wslEnv}` : wslEnv;
      
      await exec.exec('wsl.exe', ['bash', '-c', runCommand], {
        env: process.env
      });

      core.info('Command completed successfully');
      return;
    }

    // Original action execution logic for 'uses'
    core.info(`Running action ${uses} in WSL environment`);
    
    // Parse action name and version
    const [owner, repo, version] = uses.split(/[@/]/g);
    core.debug(`Parsed action: owner=${owner}, repo=${repo}, version=${version}`);
    
    // Set up environment variables from with inputs
    const env = {};
    if (withInputs) {
      core.debug('Parsing with inputs:');
      core.debug(withInputs);
      
      // Parse key-value pairs with flexible delimiters
      const inputs = withInputs
        .split(/[\n,]/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .reduce((acc, line) => {
          const match = line.match(/^([^=:]+)(?:=|\s*:\s*|\s+=\s+)(.+)$/);
          if (match) {
            const [, key, value] = match;
            acc[key.trim()] = value.trim();
          }
          return acc;
        }, {});

      for (const [key, value] of Object.entries(inputs)) {
        const envKey = `INPUT_${key.toUpperCase().replace(/-/g, '_')}`;
        env[envKey] = value;
        core.debug(`Setting env var: ${envKey}=${value}`);
      }
    }

    // Add environment variables to WSLENV
    const wslEnv = [
      ...baseWslEnv,
      ...Object.keys(env).map(key => key.slice(6))
    ].join(':');

    process.env.WSLENV = process.env.WSLENV ? `${process.env.WSLENV}:${wslEnv}` : wslEnv;
    core.debug(`Set WSLENV: ${process.env.WSLENV}`);

    // Clone and install the action in WSL
    core.info('Cloning and installing action in WSL...');
    await exec.exec('wsl.exe', ['bash', '-c', `
      set -e
      mkdir -p ~/actions/${owner}/${repo}
      cd ~/actions/${owner}/${repo}
      git clone --depth 1 --branch ${version} https://github.com/${owner}/${repo}.git .
      # Install dependencies if needed
      if [ -f "package.json" ]; then
        npm install
        npm run build || true
      fi
      # First check for dist/index.js
      if [ -f "dist/index.js" ]; then
        echo "MAIN_FILE=dist/index.js" >> $GITHUB_ENV
      else
        # Check for action files and notify JavaScript to parse them
        for action_file in action.yml action.yaml; do
          if [ -f "$action_file" ]; then
            echo "ACTION_FILE=$action_file" >> $GITHUB_ENV
            break
          fi
        done
      fi
    `], {
      env: {
        ...process.env,
        ...env
      }
    });

    // Parse action file if needed
    if (!process.env.MAIN_FILE && process.env.ACTION_FILE) {
      try {
        const actionPath = path.join(process.env.HOME, 'actions', owner, repo, process.env.ACTION_FILE);
        const actionConfig = yaml.load(fs.readFileSync(actionPath, 'utf8'));
        
        if (!actionConfig.runs?.main) {
          throw new Error(`No 'main' field found in ${process.env.ACTION_FILE}`);
        }
        
        process.env.MAIN_FILE = actionConfig.runs.main;
        core.debug(`Found main entry point: ${process.env.MAIN_FILE}`);
      } catch (error) {
        core.error(`Failed to parse action file: ${error.message}`);
        throw error;
      }
    }

    // Run the action
    core.info('Running action...');
    const debugScript = process.env.GITHUB_DEBUG === 'true' ? 'env' : '';
    await exec.exec('wsl.exe', ['bash', '-c', `
      set -e
      cd ~/actions/${owner}/${repo}
      ${debugScript}
      if [ -f "$MAIN_FILE" ]; then
        node "$MAIN_FILE"
      else
        echo "Could not find entry point at $MAIN_FILE. Contents of directory:"
        ls -R
        exit 1
      fi
    `], {
      env: {
        ...process.env,
        ...env
      }
    });

    core.info('Action completed successfully');

  } catch (error) {
    core.error('Action failed with error:');
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
