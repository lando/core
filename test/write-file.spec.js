/*
 * Tests for utils/write-file.
 * @file write-file.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const fs = require('fs');
const os = require('os');
const path = require('path');

// Get the module to test
const write = require('../utils/write-file');

describe('write-file', () => {
  let tmpdir;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-write-file-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, {force: true, recursive: true});
  });

  it('should write string data to a file', () => {
    const file = path.join(tmpdir, 'test.crt');
    write(file, 'CERTIFICATE DATA');
    expect(fs.readFileSync(file, 'utf8')).to.equal('CERTIFICATE DATA');
  });

  it('should create parent directories if they do not exist', () => {
    const file = path.join(tmpdir, 'certs', 'deeper', 'test.crt');
    write(file, 'CERTIFICATE DATA');
    expect(fs.readFileSync(file, 'utf8')).to.equal('CERTIFICATE DATA');
  });

  it('should overwrite an existing file without replacing its inode', () => {
    // see https://github.com/lando/core/issues/242, replacing the inode of a bind mounted file
    // breaks remounts on wsl/docker desktop
    const file = path.join(tmpdir, 'test.crt');
    write(file, 'ORIGINAL');
    const inode = fs.statSync(file).ino;
    write(file, 'REWRITTEN');
    expect(fs.readFileSync(file, 'utf8')).to.equal('REWRITTEN');
    expect(fs.statSync(file).ino).to.equal(inode);
  });

  it('should recover if a directory exists at the target path', () => {
    // see https://github.com/lando/core/issues/486, docker compose creates missing bind mount
    // sources as directories which then blocks cert generation with EISDIR
    const file = path.join(tmpdir, 'test.crt');
    fs.mkdirSync(path.join(file, 'rogue'), {recursive: true});
    write(file, 'CERTIFICATE DATA');
    expect(fs.statSync(file).isFile()).to.equal(true);
    expect(fs.readFileSync(file, 'utf8')).to.equal('CERTIFICATE DATA');
  });

  it('should recover if a directory exists at the target path for json and yaml', () => {
    for (const ext of ['json', 'yaml']) {
      const file = path.join(tmpdir, `test.${ext}`);
      fs.mkdirSync(path.join(file, 'rogue'), {recursive: true});
      write(file, {lando: true});
      expect(fs.statSync(file).isFile()).to.equal(true);
    }
  });
});
