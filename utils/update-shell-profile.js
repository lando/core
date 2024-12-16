'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const read = require('./read-file');
const write = require('./write-file');

const trim = (data = []) => {
  while (data.length > 0 && data[data.length - 1] === '') data.pop();
  data.push('');
  return data;
};

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
    const lines = trim(content.split('\n'));

    // loops through the updates and add/update as needed
    for (const [update, search] of updates) {
      const index = lines.findIndex(line => line.includes(search) || line.includes(update));
      if (index === -1) {
        lines.push(update);
      } else {
        lines[index] = update;
      }
    }

    // Write the modified content back to the file
    write(file, `${trim(lines).join(os.EOL)}${os.EOL}`);

  // handle errors
  } catch (error) {
    throw new Error(`Failed to update file: ${error.message}`);
  }
};
