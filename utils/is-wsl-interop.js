'use strict';

const fs = require('fs');
const os = require('os');

// Checks to see if Docker is installed via WSL/Windows interop.
module.exports = engineBin => {
  const isWsl = os.release().toLowerCase().includes('microsoft');
  // Docker Desktop for Windows keeps the .exe in the same directory as the WSL binary.
  return isWsl && fs.existsSync(`${engineBin}.exe`);
};
