
'use strict';

module.exports = (key, registry = 'https://registry.npmjs.org') => {
  // if this is valid url then should be easy
  try {
    const url = new URL(key);
    const registry = `//${url.host}/`;
    const method = url.pathname.split('/:')[1] || url.pathname.split('/')[1] || '_authToken';
    return {registry, method};

  // if its not then handle the two cases and recurse
  } catch (e) {
    // if key starts with // then add a bogus protocol and recurse
    if (key.startsWith('//')) return module.exports(`lando:${key}`);
    // key needs default
    else return module.exports(`${registry}/${key}`);
  }
};
