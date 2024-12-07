'use strict';

module.exports = async lando => {
  // get the user setup defaults
  const sopts = lando?.config?.setup;
  // we dont need to show the summary here
  sopts.yes = true;
  // skip common plugins for now?
  sopts.skipCommonPlugins = true;

  // get our setup tasks
  const tasks = await lando.getSetupStatus(sopts);

  // do we need to install anything?
  // @NOTE: is it right to include CANT INSTALL in here?
  const notInstalled = tasks.filter(task => task.state !== 'INSTALLED');

  // try to run setup if needed
  if (notInstalled.length > 0) {
    // should we show the header
    const showHeader = notInstalled.find(task => {
      if (task.id === 'setup-build-engine') return true;
      if (task.restart) return true;
      return false;
    });

    try {
      // if not yes then show full setup banner?
      if (showHeader && lando.cli) console.error(lando.cli.makeArt('runningSetup'));
      // run setup
      await lando.setup(sopts);
      // reload plugins
      await lando.reloadPlugins();
      // reload needed config
      const {orchestratorBin, orchestratorVersion, dockerBin, engineConfig} = require('../utils/build-config')();
      // reset needed config
      lando.config = {...lando.config, orchestratorBin, orchestratorVersion, dockerBin, engineConfig};
      // we need to explicitly reset this for some reason
      lando.config.orchestratorBin = require('../utils/get-compose-x')(lando.config);

      // reload engine
      lando.engine = require('../utils/setup-engine')(
        lando.config,
        lando.cache,
        lando.events,
        lando.log,
        lando.shell,
        lando.config.instance,
      );

      // @TODO: rerun task?
    } catch (error) {
      if (lando.cli) console.error(lando.cli.makeArt('needsSetup'));
      console.error(error);
      throw Error('Critical dependencies could not be installed!');
    }
  }
};
