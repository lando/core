'use strict';

module.exports = c => c.cid || c.id || c.containerName || c.containerID || c.name;
