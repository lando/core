/*
 * Tests for env.
 * @file env.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
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

const getDockerBinPath = require('./../utils/get-docker-bin-path');

describe('get-docker-bin-path', () => {
  it('should return the correct lando-provided path on win32', () => {
    setPlatform('win32');
    process.env.ProgramW6432 = 'C:\\Program Files';
    const dockerBinPath = getDockerBinPath();
    const pf = process.env.ProgramW6432;
    const value = path.win32.join(pf, 'Docker', 'Docker', 'resources', 'bin');
    expect(dockerBinPath).to.equal(value);
    resetPlatform();
    delete process.env.ProgramW6432;
  });

  it('should fallback to the ProgramFiles path on win32', () => {
    setPlatform('win32');
    const holder = process.env.ProgramW6432;
    process.env.ProgramFiles = 'C:\\Program Files';
    delete process.env.ProgramW6432;
    const dockerBinPath = getDockerBinPath();
    const pf = process.env.ProgramFiles;
    const value = path.win32.join(pf, 'Docker', 'Docker', 'resources', 'bin');
    expect(dockerBinPath).to.equal(value);
    resetPlatform();
    process.env.ProgramW6432 = holder;
    delete process.env.ProgramFiles;
  });

  it('should return the correct lando-provided path on linux', () => {
    setPlatform('linux');
    const dockerBinPath = getDockerBinPath();
    expect(dockerBinPath).to.equal('/usr/share/lando/bin');
    resetPlatform();
  });

  it('should return the correct lando-provided path on darwin', () => {
    setPlatform('darwin');
    const dockerBinPath = getDockerBinPath();
    expect(dockerBinPath).to.equal('/usr/bin');
    resetPlatform();
  });
});
