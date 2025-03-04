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

const getDockerExecutable = require('../utils/get-docker-x');
const getDockerBinPath= require('../utils/get-docker-bin-path');

describe('get-docker-x', () => {
  it('should return the correct lando-provided path on win32', () => {
    setPlatform('win32');
    filesystem({'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe': 'CODEZ'});
    process.env.ProgramW6432 = 'C:\\Program Files';
    const dockerExectuable = getDockerExecutable();
    const value = path.win32.join(getDockerBinPath(), 'docker.exe');
    expect(dockerExectuable).to.equal(value);
    resetPlatform();
    delete process.env.ProgramW6432;
  });

  it('should return the normal system path on linux', () => {
    setPlatform('linux');
    filesystem({'/usr/bin/docker': 'CODEZ'});
    const dockerExecutable = getDockerExecutable();
    expect(dockerExecutable).to.equal('/usr/bin/docker');
    filesystem.restore();
    resetPlatform();
  });

  it('should return the correct lando-provided path on darwin', () => {
    setPlatform('darwin');
    filesystem({'/Applications/Docker.app/Contents/Resources/bin/docker': 'CODEZ'});
    const dockerExecutable = getDockerExecutable();
    expect(dockerExecutable).to.equal('.');
    filesystem.restore();
    resetPlatform();
  });

  it('should fall back to an in PATH provided path if docker is not in the usual place', () => {
    setPlatform('linux');
    const OLDPATH = process.env.PATH;
    process.env.PATH = '/usr/local/bin';
    filesystem({'/usr/local/bin/docker': 'CODEZ'});
    const dockerExecutable = getDockerExecutable();
    expect(_.isString(dockerExecutable)).to.equal(true);
    expect(path.parse(dockerExecutable)).to.be.an('Object');
    filesystem.restore();
    process.env.PATH = OLDPATH;
    resetPlatform();
  });
});
