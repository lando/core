'use strict';

// Modules
const _ = require('lodash');
const isStringy = require('./is-stringy');

/*
 * Helper to get dynamic service keys for stripping
 */
const getDynamicKeys = (answer, answers = {}) => _(answers)
  .map((value, key) => ({key, value}))
  .filter(data => data.value === answer)
  .map(data => data.key)
  .map(key => (_.size(key) === 1) ? `-${key}` : `--${key}`)
  .value();

/*
 * Helper to handle dynamic services
 *
 * Set SERVICE from answers and strip out that noise from the rest of
 * stuff, check answers/argv for --service or -s, validate and then remove
 */
const handleDynamic = (config, options, answers = {}, sapis = {}) => {
  if (_.startsWith(config.service, ':')) {
    const answer = answers[config.service.split(':')[1]];
    // Remove dynamic service option from argv
    _.remove(process.argv, arg => _.includes(getDynamicKeys(answer, answers).concat(answer), arg));
    // get the service
    const service = answers[config.service.split(':')[1]];
    // Return updated config
    return _.merge({}, config, {sapi: sapis[service] ?? false, service});
  } else {
    return config;
  }
};

/*
 * Helper to process args
 *
 * We assume pass through commands so let's use argv directly and strip out
 * the first three assuming they are [node, lando.js, options.name]'
 * Check to see if we have global lando opts and remove them if we do
 */
const handleOpts = (config, argopts = []) => {
  // Append any user specificed opts
  argopts = argopts.concat(process.argv.slice(3));
  // If we have no args then just return right away
  if (_.isEmpty(argopts)) return config;
  // Return
  return _.merge({}, config, {args: argopts});
};

/*
 * Helper to get passthru options
 */
const handlePassthruOpts = (options = {}, answers = {}) => _(options)
  .map((value, key) => _.merge({}, {name: key}, value))
  .filter(value => value.passthrough === true && !_.isNil(answers[value.name]))
  .map(value => `--${value.name}=${answers[value.name]}`)
  .value();

/*
 * Helper to convert a command into config object
 */
const parseCommand = (cmd, service, sapis) => {
  const command = (_.isObject(cmd) && !isStringy(cmd)) ? cmd[_.first(_.keys(cmd))] : cmd;
  service = (_.isObject(cmd) && !isStringy(cmd)) ? _.first(_.keys(cmd)) : service;

  return {
    command,
    sapi: sapis[service] ?? undefined,
    service,
  };
};

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (cmd, service, options = {}, answers = {}, sapis = {}) => _(cmd)
  // Put into an object so we can handle "multi-service" tooling
  .map(cmd => parseCommand(cmd, service, sapis))
  // Handle dynamic services
  .map(config => handleDynamic(config, options, answers, sapis))
  // Add in any argv extras if they've been passed in
  .map(config => handleOpts(config, handlePassthruOpts(options, answers)))
  // Wrap the command in /bin/sh if that makes sense
  .map(config => ({...config, command: require('./shell-escape')(config.command, true, config.args, config.sapi)}))
  // Add any args to the command and compact to remove undefined
  .map(config => ({...config, command: _.compact(config.command.concat(config.args))}))
  // Put into an object
  .value();
