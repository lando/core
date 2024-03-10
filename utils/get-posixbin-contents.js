'use strict';

module.exports = dest => `#!/usr/bin/env bash
set -e
LANDO_WRAPPER_SCRIPT=1 LANDO_ENTRYPOINT_NAME=lando "${dest}" "$@";
`;
