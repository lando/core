'use strict';

// checks to see if a setting is disabled
module.exports = ({name, version, tested}) => ({
  type: 'info',
  title: `Using an untested version of DOCKER ${name.toUpperCase()}`,
  detail: [
    `We have not tested version ${version} yet so congrats on being a pioneer!`,
    'Seriously though, this is usually not an issue but be mindful that you',
    'are in uncharted territory. If you encounter an issue we recomend',
    `you downgrade to something ${tested}.`,
  ],
});
