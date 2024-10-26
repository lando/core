'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const read = require('./read-file');
const write = require('./write-file');

module.exports = (file, updates = []) => {
  // create empty file if it doesnt exist first
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    write(file, '');
  }

  try {
    // get the content
    const content = read(file);
    // split into lines
    const lines = content.split('\n');
    // if we end up with second to last line that is empty then pop
    if (lines[lines.length - 2].trim() === '') lines.pop();

    // loops through the updates and add/update as needed
    for (const [update, search] of updates) {
      const index = lines.findIndex(line => line.includes(search) || line.includes(update));
      if (index === -1) {
        lines.push(update);
      } else {
        lines[index] = update;
      }
    }

    // if the last element doesnt contain a newline
    if (!lines[lines.length - 1].includes(os.EOL)) lines.push(os.EOL);

    // Write the modified content back to the file
    write(file, lines.join(os.EOL));

  // handle errors
  } catch (error) {
    throw new Error(`Failed to update file: ${error.message}`);
  }
};
