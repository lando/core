/*
 * Tests for env.
 * @file env.spec.js
 */

'use strict';

// Setup chai.
const _ = require('lodash');
const chai = require('chai');
const expect = chai.expect;
const filesystem = require('mock-fs');
const path = require('path');
chai.should();

// Save the original process.platform
const originalPlatform = process.platform;

// Helpers to manage process.platform hijacking
const setPlatform = platform => {
  Object.defineProperty(process, 'platform', {value: platform});
};
const resetPlatform = () => {
  Object.defineProperty(process, 'platform', {value: originalPlatform});
};

const getComposeExecutable = require('../utils/get-compose-x');
const getDockerBinPath= require('../utils/get-docker-bin-path');
require('../utils/get-compose-bin-path');

describe('get-compose-x', () => {
  it('should return the correct lando-provided path on win32', () => {
    setPlatform('win32');
    filesystem({'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe': 'CODEZ'});
    process.env.ProgramW6432 = 'C:\\Program Files';
    const composeExecutable = getComposeExecutable();
    const value = path.win32.join(getDockerBinPath(), 'docker-compose.exe');
    expect(composeExecutable).to.equal(value);
    resetPlatform();
    delete process.env.ProgramW6432;
  });

  it('should return the correct lando-provided path on linux', () => {
    setPlatform('linux');
    filesystem({'/usr/share/lando/bin/docker-compose': 'CODEZ'});
    const composeExecutable = getComposeExecutable();
    expect(composeExecutable).to.equal('/usr/share/lando/bin/docker-compose');
    filesystem.restore();
    resetPlatform();
  });

  it('should return the correct lando-provided path on darwin', () => {
    setPlatform('darwin');
    filesystem({'/Applications/Docker.app/Contents/Resources/bin/docker-compose': 'CODEZ'});
    const composeExecutable = getComposeExecutable();
    expect(composeExecutable)
      .to
      .equal('/Applications/Docker.app/Contents/Resources/bin/docker-compose');
    filesystem.restore();
    resetPlatform();
  });

  it('should fall back on POSIX to PATH if the lando-provided one does not exist', () => {
    setPlatform('linux');
    const OLDPATH = process.env.PATH;
    process.env.PATH = '/usr/local/bin';
    filesystem({'/usr/local/bin/docker-compose': 'CODEZ'});
    const composeExecutable = getComposeExecutable();
    expect(_.isString(composeExecutable)).to.equal(true);
    expect(path.parse(composeExecutable)).to.be.an('Object');
    filesystem.restore();
    process.env.PATH = OLDPATH;
    resetPlatform();
  });
});
