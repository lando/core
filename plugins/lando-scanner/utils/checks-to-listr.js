'use strict';

const _ = require('lodash');
const chalk = require('chalk');

module.exports = ({
  args,
  type,
  title,
  service,
  test = () => {},
  skip = false,
  delay = 1000,
  retry = 10,
} = {}) => ({
  title: chalk.grey(title || `${type} ${args[0]}`),
  retry: retry,
  task: (ctx, task) => {
    // if skip then we are done
    if (skip === true) {
      task.title = chalk.yellow(title);
      task.skip();

    // otherwise try to actually test
    } else {
      return test(...args).then(response => {
        const code = `[${_.get(response, 'lando.code', 'UNKNOWN')}]`;
        task.title = `${chalk.green(title)} ${chalk.dim(code)}`;
      })
      .catch(error => {
        // assess retry situation
        const {count} = task.isRetrying();
        // get error code and retry ratio
        const code = `[${error.lando.code}]`;
        const rm = count > 0 && count < retry ? `${count}/${retry} ` : '';

        // if this is our final retry then fail and bail
        if (count === retry) {
          task.title = `${chalk.red(title)} ${chalk.dim(code)} ${chalk.dim(_.upperCase(error.message))}`;
          throw error;

        // otherwise proceed with retrying
        } else {
          task.title = `${chalk.grey(title)} ${chalk.dim(rm)}${chalk.dim(code)}`;
          return require('delay')(delay + (100 * count)).then(() => {
            throw error;
          });
        }
      });
    }
  },
});
