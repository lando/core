'use strict';

const dc = (shell, bin, cmd, {compose, project, opts = {}}) => {
  const dockerCompose = require('../lib/compose');
  const run = dockerCompose[cmd](compose, project, opts);
  return shell.sh([bin].concat(run.cmd), run.opts);
};

module.exports = (config, cache, events, log, shell, id) => {
  const Engine = require('../lib/engine');
  const Landerode = require('../lib/docker');
  const LandoDaemon = require('../lib/daemon');
  // get enginey stuff
  const {orchestratorBin, orchestratorVersion, dockerBin, engineConfig} = config;
  const docker = new Landerode(engineConfig, id);
  const daemon = new LandoDaemon(
    cache,
    events,
    dockerBin,
    log,
    config.process,
    orchestratorBin,
    orchestratorVersion,
    config.userConfRoot,
  );
  const compose = (cmd, datum) => dc(shell, orchestratorBin, cmd, datum);
  return new Engine(daemon, docker, compose, config);
};
