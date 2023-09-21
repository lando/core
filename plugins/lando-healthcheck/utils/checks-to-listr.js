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
  retry = 10,
} = {}) => ({
  title: chalk.grey(title || `${type} ${args[0]}`),
  retry,
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
        const color = count === retry ? 'red' : 'grey';
        const rm = count > 0 && count < retry ? `${count}/${retry} ` : '';
        const code = `[${error.lando.code}]`;
        const message = count === retry ? ` - ${_.upperCase(error.message)}` : '';
        task.title = `${chalk[color](title)} ${chalk.dim(rm)}${chalk.dim(code)}${chalk.dim(message)}`;

        // delay and backoff for UX purposes\
        return require('delay')(3000 + (100 * count)).then(() => {
          throw error;
        });
      });
    }
  },
});
