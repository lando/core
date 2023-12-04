'use strict';

const fs = require('fs');
const path = require('path');

module.exports = (dir, {
  refFile = path.join(dir, '.git', 'HEAD'),
  short = false,
} = {}) => {
  // if reffile doesnt exist then return false
  if (!fs.existsSync(refFile)) return false;

  const gitBase = path.join(dir, '.git');

  // if the refFile has another ref in it then we need to reset the reffile
  if (fs.readFileSync(refFile, {encoding: 'utf-8'}).startsWith('ref: ')) {
    const contents = fs.readFileSync(refFile, {encoding: 'utf-8'}).trim();
    const parts = contents.split('ref: ');
    const ref = parts[1] ? parts[1] : 'HEAD';
    refFile = path.join(gitBase, ref);
  }

  // get the commit
  const commit = fs.readFileSync(refFile, {encoding: 'utf-8'}).trim();

  // if we are "short" then return first seven
  if (short && typeof commit === 'string') return commit.slice(0, 7);

  // otherwise just return the whole thing
  return commit;
};
