'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const toPosixPath = require('./to-posix-path');
const write = require('./write-file');
const {nanoid} = require('nanoid');

const validPath = path => require('valid-path')(toPosixPath(path), {simpleReturn: true});

module.exports = (file, {base = os.tmpdir(), id = nanoid(), tmpdir = os.tmpdir()} = {}) => {
  // if not a string then return undefined
  if (typeof file !== 'string') return undefined;

  // if its a single line valid and starts with ./ then assume its a local file
  if (file.split('\n').length === 1 && validPath(file) && file.startsWith('./')) {
    file = file.replace('./', 'file://');
  }
  // ditto for .\\
  if (file.split('\n').length === 1 && validPath(file) && file.startsWith('.\\')) {
    file = file.replace('.\\', 'file://');
  }

  // if its a single line string that doesnt start with file then assume its command contents and multiline line
  if (file.split('\n').length === 1 && !file.startsWith('file://')) {
    file = `${file}\n`;
  }

  // if its a muliline string then map it to a file
  if (file.split('\n').length > 1) {
    // split and trim any empty lines at the top
    file = file.split('\n');
    file = file.slice(file.findIndex(line => line.length > 0));

    // now just try to make it look pretty
    const leader = file.find(line => line.length > 0).match(/^\s*/)[0].length ?? 0;
    const contents = file.map(line => line.slice(leader)).join('\n');

    // reset file to a path and make executable
    file = path.join(tmpdir, id);
    write(file, contents, {forcePosixLineEndings: true});
    fs.chmodSync(file, '755');
    file = `file://${file}`;
  }

  // if we get here and it doesnt start with file:// something has gone amiss
  if (!file.startsWith('file://')) new Error(`Could not parse scripty content: ${file}`);

  // reset the file
  file = file.replace('file://', '');

  // and normalize path
  if (!path.isAbsolute(file)) file = path.join(base, file);

  // return
  return file;
};
