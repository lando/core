'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // get checks for each URL
  const checks = _(app.info)
    .filter(service => !_.isEmpty(service.urls))
    .flatMap(service => _(service.urls)
      .map(url => ({
        type: 'url-scan',
        test: require('../utils/scanner'),
        service: service.service,
        delay: _.get(app, `config.services.${service.service}.scanner.delay`, 1000),
        retry: _.get(app, `config.services.${service.service}.scanner.retry`, 25),
        skip: _.get(app, `config.services.${service.service}.scanner`) === false || _.includes(url, '*'),
        title: url,
        args: [url, {
          okCodes: _.get(app, `config.services.${service.service}.scanner.okCodes`, [300, 301, 302, 303, 304, 305, 306, 307, 308, 404]), // eslint-disable-line max-len
          maxRedirects: _.get(app, `config.services.${service.service}.scanner.maxRedirects`, 0),
          timeout: _.get(app, `config.services.${service.service}.scanner.timeout`, 10000),
          log: app.log.debug,
          path: _.get(app, `config.services.${service.service}.scanner.path`, '/'),
        }],
      }))
      .value(),
    )
    .value();

  // combine our checks into app.checks
  app.checks = [...app.checks, ...checks].filter(Boolean);

  // if we have the CLI then add more checks but as listr tasks
  const tasks = _(app.checks)
    .filter(checks => checks.type === 'url-scan')
    .groupBy('service')
    .map((tasks, name) => ({
      title: lando.cli.chalk.cyan(`${_.upperCase(name)} URLS`),
      task: (ctx, task) => {
        const subtasks = _(tasks).map(subtask => require('../utils/checks-to-tasks')(subtask)).value();
        return task.newListr(subtasks, {concurrent: true, exitOnError: false});
      },
    }))
    .value();

  // add our listr2 check tasklist
  app.checks.push({
    type: 'url-scan-tasks',
    test: app.runTasks.bind(app),
    args: [tasks, {
      renderer: 'lando',
      rendererOptions: {level: 1},
    }],
  });
};
