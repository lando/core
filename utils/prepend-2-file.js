'use strict';

const fs = require('fs').promises;
const path = require('path');
const {existsSync} = require('fs');

module.exports = async (file, line) => {
  try {
    // create empty file if it does nto exist
    if (!existsSync(file)) {
      await fs.mkdir(path.dirname(file), {recursive: true});
      await fs.open(file, 'w').then(fileHandle => fileHandle.close());
    }

    // Read the current content of the file
    let content = await fs.readFile(file, 'utf8');

    // Check if the line already exists in the file
    if (content.split('\n').includes(line)) return;

    // Prepend the line if it does not exist
    content = `${line}\n${content}`;

    // Write the modified content back to the file
    await fs.writeFile(file, content, 'utf8');

  // handle errors
  } catch (error) {
    throw new Error(`Failed to prepend line: ${error.message}`);
  }
};
