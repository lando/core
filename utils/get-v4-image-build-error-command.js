'use strict';

const {color} = require('listr2');
const write = require('../utils/write-file');

module.exports = ({
  logfile = '/tmp/error.log',
  short = '',
  stderr = '',
  code = 1,
  context = {},
} = {}) => {
  const logs = `${color.red(`Lando failed to build an image for the service ${context.id}!`)}

You will need to resolve the build failure to correctly launch this service. To that end here is some helpful
information:

${color.bold('IMAGEFILE')}: ${context.imagefile}
${color.bold('CONTEXT')}: ${context.context}
${color.bold('TAG')}: ${context.tag}
${color.bold('ERROR')}: ${color.red(short)}

${color.bold('DEBUG')}:
${stderr}
`;

  write(logfile, logs);
  return `sh -c "cat /tmp/error.log && exit ${code}"`;
};
