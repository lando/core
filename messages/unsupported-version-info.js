'use strict';

// checks to see if a setting is disabled
module.exports = ({name, version, wants, link}) => ({
  type: 'info',
  title: `Using an unsupported version of DOCKER ${name.toUpperCase()}`,
  detail: [
    `You have version ${version} but Lando wants something in the ${wants} range.`,
    'If you have purposefully installed an unsupported version and know what you are doing',
    'you can probably ignore this. If not we recommend you use a supported version',
    'as this ensures we can provide the best support and stability.',
  ],
  url: link,
});
