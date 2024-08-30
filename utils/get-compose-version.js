'use strict';

const shell = require('shelljs');

/**
 * get-compose-version
 * get the docker compose version from a know existing orchestratorBin 
 * @param string orchestratorBin the binary path 
 * @returns string|null orchestratorVersion
 */
module.exports = (orchestratorBin) => {
  
  // default to no result
  var result = null;
  // call the orchestrator with a version flag
  shell.exec(orchestratorBin + ' --version', (code, stdout, stderror) => {

   // if execution succeeded
   if(code === 0){

     // find the version string
     const matches = stdout.match('/\d+.\d+.\d+\s*$/');

     // return the match or nothing
     result = ( matches && matches[0]) || null;
     
   } 
    
  });
  
  return result;
};
