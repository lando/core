'use strict';

// Modules
const _ = require('lodash');
const niceFont = require('yargonaut').asFont;
const chalk = require('yargonaut').chalk();
const figures = require('figures');
const os = require('os');

/*
 * Helper to stylize code or a command
 */
const codeMe = text => `Run ${chalk.bold(text)}`;

/*
 * Helper to stylize an italicize
 */
const italicize = name => chalk.italic(name);

/*
 * determines the "best" header message to display
 */
const getHeader = (messages = []) => {
  // if messages is not an array then force it to be
  if (!Array.isArray(messages)) messages = [];

  // gather all the types
  const types = messages.map(message => message.type);

  // error
  if (types.includes('error')) return chalk.red(niceFont('UH OH!', 'ANSI Shadow'));

  // warning
  else if (types.includes('warning')) return chalk.yellow(niceFont('Warning!', 'Small Slant'));
  else if (types.includes('warn')) return chalk.yellow(niceFont('Warning!', 'Small Slant'));

  // tip/info
  else if (types.includes('info')) return chalk.cyan(niceFont('Boomshakalaka!!!!', 'Small Slant'));
  else if (types.includes('tip')) return chalk.cyan(niceFont('Boomshakalaka!!!!', 'Small Slant'));

  // everything else
  else return chalk.magenta(niceFont('Boomshakalaka!!!!', 'Small Slant'));
};

const getStyle = (type = 'tip') => {
  switch (type) {
    case 'error':
      return {color: 'red', figure: figures.cross};
    case 'warn':
    case 'warning':
      return {color: 'yellow', figure: figures.warning};
    case 'info':
    case 'tip':
    default:
      return {color: 'cyan', figure: figures.info};
  }
};

/*
 * Helper to stylize a warning message
 */
const statusMessage = ({title, type = 'info', detail = [], command, url} = {}) => {
  const style = getStyle(type);
  const message = [chalk[style.color](`${style.figure} ${title}`)];

  // if we have detail add that
  if (detail.length > 0) detail.map(line => message.push(`  ${line}`));

  // if we have a url then add that
  if (url) message.push(`  ${chalk.green(url)}`);
  else if (command) message.push(`  ${codeMe(command)}`);

  // add some padding
  message.push('');

  // return
  return message.map(line => `  ${line}`).join(os.EOL);
};

/*
 * Helper to show that an app has started
 */
exports.appDestroy = ({name, phase = 'pre'} = {}) => {
  switch (phase) {
    case 'abort':
      return chalk.yellow('DESTRUCTION AVERTED!');
    case 'pre':
      return chalk.cyan(`Preparing to consign ${italicize(name)} to the dustbin of history...`);
    case 'post':
      return [
        chalk.red(`The app known as ${italicize(name)} has paid the ${chalk.bold('IRON PRICE')}. App destroyed!`),
      ].join(os.EOL);
  }
};

/*
 * Helper to show that an app has restarted
 */
exports.appRebuild = ({name, phase = 'pre', messages = []} = {}) => {
  switch (phase) {
    case 'abort':
      return chalk.yellow('REBUILD ABORTED!');
    case 'error':
      return exports.appStart({name, phase: 'error', messages});
    case 'pre':
      return chalk.cyan('Rising anew like a fire phoenix from the ashes! Rebuilding app...');
    case 'post':
      return exports.appStart({name, phase: 'post'});
    case 'post_legacy':
      return exports.appStart({name, phase: 'post_legacy'});
    case 'report':
      return exports.appStart({name, phase: 'report', messages});
    case 'report_legacy':
      return exports.appStart({name, phase: 'report_legacy', messages});
  }
};

/*
 * Helper to show that an app has restarted
 */
exports.appRestart = ({name, phase = 'pre', messages = []} = {}) => {
  switch (phase) {
    case 'error':
      return exports.appStart({name, phase: 'error', messages});
    case 'pre':
      return chalk.cyan('Stopping and restarting your app...Shiny!');
    case 'post':
      return exports.appStart({name, phase: 'post'});
    case 'post_legacy':
      return exports.appStart({name, phase: 'post_legacy'});
    case 'report':
      return exports.appStart({name, phase: 'report', messages});
    case 'report_legacy':
      return exports.appStart({name, phase: 'report_legacy', messages});
  }
};

/*
 * Helper to show that an app has started
 */
exports.appStart = ({name, phase = 'pre', messages = []} = {}) => {
  switch (phase) {
    case 'error':
      return [
        '',
        chalk.red(niceFont('Uh oh!', 'ANSI Shadow')),
        '',
        'An unrecoverable error occurred while starting up your app!',
        'Here are a few things you can try to get back into a good state:',
        '',
        chalk.yellow(` ${figures.squareSmallFilled} Try running ${codeMe('lando rebuild')}`),
        chalk.yellow(` ${figures.squareSmallFilled} Try restarting in debug mode ${codeMe('lando restart --debug')}`),
        chalk.yellow(` ${figures.squareSmallFilled} Try checking the logs with ${codeMe('lando logs')}`),
        '',
        'If those fail then consult the troubleshooting materials:',
        '',
        chalk.magenta(` ${figures.squareSmallFilled} https://docs.lando.dev/help/logs.html`),
        chalk.magenta(` ${figures.squareSmallFilled} https://docs.lando.dev/help/updating.html`),
        '',
        'Or post your issue to Slack or GitHub',
        '',
        chalk.green(` ${figures.squareSmallFilled} Slack - https://launchpass.com/devwithlando`),
        chalk.green(` ${figures.squareSmallFilled} GitHub - https://github.com/lando/lando/issues/new/choose`),
        '',
      ].join(os.EOL);
    case 'pre':
      return chalk.cyan(`Let\'s get this party started! Starting app ${italicize(name)}...`);
    case 'post':
      return [
        '',
        getHeader(messages),
        '',
        'Your app is starting up... See scanning below for real time status',
        'In the meantime, here are some vitals:',
        '',
      ].join(os.EOL);
    case 'post_legacy':
      return [
        '',
        getHeader(messages),
        '',
        'Your app has started up correctly.',
        'Here are some vitals:',
        '',
      ].join(os.EOL);
    case 'report_legacy':
      const reportLegacy = [
        '',
        getHeader(messages),
        '',
        `Your app started up but we detected some things you ${chalk.bold('may')} wish to investigate.`,
        '',
      ];

      // Add in all our messages
      _.forEach(messages, message => {
        reportLegacy.push(statusMessage(message));
      });

      reportLegacy.push('');
      reportLegacy.push('Here are some vitals:');
      reportLegacy.push('');
      return reportLegacy.join(os.EOL);
    case 'report':
      const report = [
        '',
        getHeader(messages),
        '',
        'Your app is starting up but we have already detected some things you should investigate.',
        `These ${chalk.bold('may')} or ${chalk.bold('may not')} prevent your app from working.`,
        '',
      ];

      // Add in all our messages
      _.forEach(messages, message => {
        report.push(statusMessage(message));
      });

      report.push('');
      report.push('Here are some vitals:');
      report.push('');
      return report.join(os.EOL);
  }
};

/*
 * Helper to show that an app has stopped
 */
exports.appStop = ({name, phase = 'pre'} = {}) => {
  switch (phase) {
    case 'pre':
      return chalk.cyan(`This party\'s over :( Stopping app ${italicize(name)}`);
    case 'post':
      return chalk.red(`App ${italicize(name)} has been stopped!`);
  }
};

/*
 * Helper to show that a first error has occurred
 */
exports.crash = () => [
  '',
  chalk.red(niceFont('CRASH!!!', 'ANSI Shadow')),
  '',
  'Would you like to report it, and subsequent crashes, to Lando?',
  '',
  'This data is only used by the Lando team to ensure the application runs as well as it can.',
  chalk.green('For more details check out https://docs.lando.dev/privacy/'),
].join(os.EOL);

/*
 * Helper to show status of experimental toggle
 */
exports.experimental = (on = false) => {
  switch (on) {
    case true:
      return [
        '',
        chalk.green(niceFont('Activated!!!', 'Small Slant')),
        chalk.magenta('Experimental features are now ON'),
        '',
      ].join(os.EOL);
    case false:
      return [
        '',
        chalk.red(niceFont('Deactivated!', 'Small Slant')),
        chalk.grey('Experimental features are now OFF'),
        '',
      ].join(os.EOL);
  }
};

/*
 * Helper to show init header
 */
exports.init = () => [
  '',
  chalk.green(niceFont('Now we\'re', 'Small Slant')),
  chalk.magenta(niceFont('COOKING WITH FIRE!', 'Small Slant')),
  'Your app has been initialized!',
  '',
  `Go to the directory where your app was initialized and run ${codeMe('lando start')} to get rolling.`,
  'Check the LOCATION printed below if you are unsure where to go.',
  '',
  'Oh... and here are some vitals:',
  '',
].join(os.EOL);

/*
 * Helper to show new content
 */
exports.newContent = (type = 'guide') => [
  '',
  chalk.green(niceFont(`New ${type} has been...`, 'Small Slant')),
  chalk.magenta(niceFont('Created!', 'Small Slant')),
  '',
  `Make sure you have run ${codeMe('lando start')} to get the docs running locally.`,
  '',
  'Oh... and here are some vitals about your new content:',
  '',
].join(os.EOL);

exports.setupHeader = (bengine = process.landoPlatform === 'linux' || process.platform === 'linux' ? 'Engine' : 'Desktop') => `
${chalk.magenta(niceFont('Lando Setup!', 'Small Slant'))}

${chalk.bold('lando setup')} is a hidden convenience command to help you satisify the
dependencies needed to run Lando. Typically it includes the installation and
setup of some combination of the below:

${chalk.cyan(`${figures.squareSmallFilled} Common Lando Plugins`)}
${chalk.cyan(`${figures.squareSmallFilled} Docker ${bengine}`)}
${chalk.cyan(`${figures.squareSmallFilled} Docker Compose`)}

However, if you already have the needed dependencies it will happily do nothing
and exit. It will attempt to install plugins first and then it will run any
needed setup tasks.

For more information on customizing setup please run ${chalk.bold('lando setup --help')}
or visit ${chalk.magenta('https://docs.lando.dev/cli/setup.html')}
`;

/*
 * Helper to show NO DOCKER error message
 */
exports.needsSetup = (dep = 'Docker Desktop') => `
${chalk.red(niceFont('U Need Setup!', 'Small Slant'))}

Lando encountered a setup error and does not have all the dependencies it needs to run!

Run ${chalk.bold('lando setup --debug')} and when it completes try running Lando again.

If you get another error or have any issues we recommend you post an issue on
GitHub or ping us in our Slack channel!

${chalk.magenta(`${figures.squareSmallFilled} Slack - https://launchpass.com/devwithlando`)}
${chalk.magenta(`${figures.squareSmallFilled} GitHub - https://github.com/lando/lando/issues/new/choose`)}
`;

/*
 * Helper to show status of secret toggle
 */
exports.poweroff = ({phase = 'pre'} = {}) => {
  switch (phase) {
    case 'pre':
      return [
        '',
        chalk.cyan('NO!! SHUT IT ALL DOWN!!!'),
        chalk.magenta(niceFont('Powering off...', 'Small Slant')),
        '',
      ].join(os.EOL);
    case 'post':
      return chalk.green('Lando containers have been spun down.');
  }
};

/*
 * Helper to show status of secret toggle
 */
exports.print = ({text, color = 'white'} = {}) => {
  return chalk[color](text);
};

/*
 * Helper to show status of secret toggle
 */
exports.printFont = ({text, color = 'magenta', font = 'Small Slant'} = {}) => {
  return chalk[color](niceFont(text, 'Small Slant'));
};

/*
 * Helper to show status of release channel
 */
exports.releaseChannel = (channel = 'stable') => {
  switch (channel) {
    case 'edge':
      return [
        '',
        chalk.green('You are now living on the'),
        chalk.magenta(niceFont('EDGE', 'Small Slant')),
        'Lando will update you about ALL new releases!',
        '',
      ].join(os.EOL);
    case 'none':
      return [
        '',
        chalk.green('You will no longer receive update notifications.'),
        chalk.yellow(niceFont('WARNING', 'Small Slant')),
        'If you do not continue to update manually this may limit our ability to support you!',
        '',
      ].join(os.EOL);
    case 'stable':
      return [
        '',
        chalk.green('Slowing things down to get more'),
        chalk.magenta(niceFont('STABLE', 'Small Slant')),
        'Lando will only update you about new stable releases!',
        '',
      ].join(os.EOL);
  }
};

/*
 * Helper to show that setup is running
 */
exports.runningSetup = () => `
${chalk.yellow(niceFont('Running Setup!', 'Small Slant'))}

Lando has detected that it does not have ${chalk.bold('critical dependencies')} it needs to run.
But ${chalk.bold('FEAR NOT')} because we are trying to install them ${chalk.bold('right now')}!

This ${chalk.italic('may')} require your password or a restart so heads up.

If you cancel out you can run ${chalk.bold('lando setup')} to manually kick it off.
`;

/*
 * Helper to show status of secret toggle
 */
exports.secretToggle = (on = false) => {
  switch (on) {
    case true:
      return [
        '',
        chalk.green(niceFont('Activated!!!', 'Small Slant')),
        chalk.magenta('The secret toggle is now ON'),
        '',
        `Rerun ${codeMe('lando')} to see the secret commands `,
        '',
      ].join(os.EOL);
    case false:
      return [
        '',
        chalk.red(niceFont('Deactivated!', 'Small Slant')),
        chalk.grey('The secret toggle is now OFF'),
        '',
      ].join(os.EOL);
  }
};

/*
 * Helper to show status of secret toggle
 */
exports.secretToggleDenied = (on = false) => [
  '',
  chalk.red(niceFont('Toggle Denied!', 'Small Slant', true)),
  '',
  chalk.magenta('You can only toggle the secret toggle when running Lando from source'),
  'See https://docs.lando.dev/contrib/activate.html',
  '',
].join(os.EOL);

/*
 * Sharing under construction
 */
exports.shareWait = () => [
  '',
  chalk.red(niceFont('OFFLINE!!!', 'ANSI Shadow')),
  '',
  'localtunnel.me has finally sunsetted it\'s free service. Lando thanks them for their great and free service.',
  '',
  'We are hard at work on a new sharing solution but it is not quite ready!',
  '',
  'Due to our massive user base we might not be able to offer free sharing to all users.',
  'So, if you are interested in using our new sharing service we recommend you sponsor at the link below!',
  chalk.green('https://lando.dev/sponsor'),
  '',
].join(os.EOL);

/*
 * Helper to show status of secret toggle
 */
exports.sudoRun = () => [
  chalk.red('Lando should never ever ever be run as root...'),
  chalk.magenta(niceFont('like ever!!!', 'Small Slant')),
].join(os.EOL);

/*
 * Helper to show status of secret toggle
 */
exports.tunnel = ({url, phase = 'pre'} = {}) => {
  switch (phase) {
    case 'pre':
      return chalk.cyan('About to share your app to a whole new world!');
    case 'post':
      return [
        '',
        chalk.magenta(niceFont('Connected!!!', 'Small Slant')),
        'A tunnel to your local Lando app been established.',
        '',
        'Here is your public url:',
        chalk.green(url),
        '',
        'Press any key to close the tunnel...',
      ].join(os.EOL);
    case 'closed':
      return chalk.green('Tunnel closed!');
  }
};

exports.badToken = () => {
  return statusMessage({
    type: 'warning',
    title: 'Invalid Machine Token',
    detail: [
      'Your machine token has been rejected by Pantheon. It may have been revoked or corrupted.',
      'Please use a different token.',
      'You can generate a new token using this link:',
    ],
    url: 'https://dashboard.pantheon.io/machine-token/create/Lando',
  });
};
