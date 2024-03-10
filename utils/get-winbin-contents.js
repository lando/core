'use strict';

module.exports = dest => `@echo off
setlocal enableextensions
set LANDO_ENTRYPOINT_NAME=lando
set LANDO_WRAPPER_SCRIPT=1
"${dest}" %*
`;
