/**
 * Tests for extract-detach.js
 * @file extract-detach.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const extractDetach = require('../utils/extract-detach');

describe('extract-detach', () => {
  it('should detect bare trailing &', () => {
    const result = extractDetach(['sleep', '100', '&']);
    expect(result.detach).to.be.true;
    expect(result.cmd).to.eql(['sleep', '100']);
  });

  it('should not treat literal trailing & in a plain argv argument as detach', () => {
    const result = extractDetach(['curl', 'https://example.test/?a=1&']);
    expect(result.detach).to.be.false;
    expect(result.cmd).to.eql(['curl', 'https://example.test/?a=1&']);
  });

  it('should return detach=false when no trailing &', () => {
    const result = extractDetach(['echo', 'hello']);
    expect(result.detach).to.be.false;
    expect(result.cmd).to.eql(['echo', 'hello']);
  });

  it('should handle empty command array', () => {
    const result = extractDetach([]);
    expect(result.detach).to.be.false;
    expect(result.cmd).to.eql([]);
  });

  it('should work with exec.sh wrapper and bare &', () => {
    const result = extractDetach(['/etc/lando/exec.sh', 'sleep', '100', '&']);
    expect(result.detach).to.be.true;
    expect(result.cmd).to.eql(['/etc/lando/exec.sh', 'sleep', '100']);
  });

  it('should work with exec.sh wrapper and appended &', () => {
    const result = extractDetach(['/etc/lando/exec.sh', 'sleep', '100&']);
    expect(result.detach).to.be.true;
    expect(result.cmd).to.eql(['/etc/lando/exec.sh', 'sleep', '100']);
  });

  it('should work with sh -c wrapper', () => {
    const result = extractDetach(['/bin/sh', '-c', 'sleep 100&']);
    expect(result.detach).to.be.true;
    expect(result.cmd).to.eql(['/bin/sh', '-c', 'sleep 100']);
  });

  it('should work with bash -c wrapper', () => {
    const result = extractDetach(['/bin/bash', '-c', 'sleep 100&']);
    expect(result.detach).to.be.true;
    expect(result.cmd).to.eql(['/bin/bash', '-c', 'sleep 100']);
  });

  it('should not modify the original array', () => {
    const original = ['sleep', '100', '&'];
    const copy = [...original];
    extractDetach(original);
    expect(original).to.eql(copy);
  });

  it('should ignore & in the middle of the command', () => {
    const result = extractDetach(['echo', '&', 'hello']);
    expect(result.detach).to.be.false;
    expect(result.cmd).to.eql(['echo', '&', 'hello']);
  });

  it('should handle single-element command with &', () => {
    const result = extractDetach(['&']);
    expect(result.detach).to.be.true;
    expect(result.cmd).to.eql([]);
  });

  it('should trim whitespace after removing & from shell wrappers', () => {
    const result = extractDetach(['/bin/sh', '-c', 'sleep 100 &']);
    expect(result.detach).to.be.true;
    expect(result.cmd[2]).to.equal('sleep 100');
  });
});
