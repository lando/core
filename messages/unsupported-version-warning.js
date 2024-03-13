'use strict';

// checks to see if a setting is disabled
module.exports = ({name, version, wants, link}) => ({
  type: 'warning',
  title: `Using an unsupported version of DOCKER ${name.toUpperCase()}`,
  detail: [
    `You have version ${version} but Lando wants something in the ${wants} range.`,
    'If you have purposefully installed an unsupported version and know what you are doing',
    'you can probably ignore this. If not we recommend you use something in the range above',
    'as this ensures we can provide the best support and stability.',
  ],
  url: link,
});
