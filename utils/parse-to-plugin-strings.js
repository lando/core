'use strict';

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (plugins = {}) => Object.entries(plugins).map(entry => entry.join('@'));
