'use strict';

const fs = require('fs');
const path = require('path');
const read = require('./read-file');

const PRIVATE_KEY_REGEX = /^-+BEGIN\s.*PRIVATE KEY-+/;

const getAllFiles = (dir, files = []) => {
  const names = fs.readdirSync(dir);

  names.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) getAllFiles(filePath, files);
    else files.push(filePath);
  });

  return files;
};

const hasPassphrase = data => {
  // check for Proc-Type and DEK-Info
  if (data.includes('Proc-Type') && data.includes('DEK-Info')) return true;

  // base64 decode the string and check for "none"
  if (!Buffer.from(data, 'base64').toString('utf8').includes('none')) return true;

  // otherwise i think we are good?
  return false;
};

module.exports = (paths = []) => {
  // if paths is a string then make it into an array
  if (typeof paths === 'string') paths = [paths];

  // now lets try to find all the private keys without passphrases
  return paths
    .filter(path => fs.existsSync(path))
    .map(path => fs.statSync(path).isDirectory() ? getAllFiles(path) : path)
    .flat(Number.POSITIVE_INFINITY)
    .map(file => ({file, contents: read(file)}))
    .filter(file => PRIVATE_KEY_REGEX.test(file.contents))
    .filter(file => !hasPassphrase(file.contents))
    .map(file => file.file);
};
