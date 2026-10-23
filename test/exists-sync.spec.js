/*
 * Tests for utils/exists-sync.
 * @file exists-sync.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

// Get the module to test
const exists = require('../utils/exists-sync');

// node >=24 emits DEP0187 when fs.existsSync gets a non path-like arg
const isNode24 = Number(process.versions.node.split('.')[0]) >= 24;

// helper to run a snippet in a child process with deprecations promoted to throws
// @NOTE: node only emits a given deprecation once per process so we cannot reliably assert on
// this from inside the shared mocha process
const runStrict = code => execFileSync(process.execPath, ['--throw-deprecation', '-e', code], {
  cwd: path.resolve(__dirname, '..'),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

describe('exists-sync', () => {
  const realFile = path.join(os.tmpdir(), 'lando-exists-sync-test.txt');

  before(() => fs.writeFileSync(realFile, 'lando'));
  after(() => fs.rmSync(realFile, {force: true}));

  it('should return false for non path-like values instead of throwing or warning', () => {
    const invalids = [undefined, null, {}, {file: '/tmp'}, [], ['/tmp'], 42, true, false, NaN, () => {}];
    for (const invalid of invalids) {
      expect(exists(invalid), `expected false for ${String(invalid)}`).to.equal(false);
    }
  });

  it('should behave like fs.existsSync for path-like values', () => {
    expect(exists(realFile)).to.equal(true);
    expect(exists(Buffer.from(realFile))).to.equal(true);
    expect(exists(new URL(`file://${realFile}`))).to.equal(true);

    const missing = path.join(os.tmpdir(), 'lando-exists-sync-nope.txt');
    expect(exists(missing)).to.equal(false);
    expect(exists(Buffer.from(missing))).to.equal(false);
    expect(exists(new URL(`file://${missing}`))).to.equal(false);
  });

  it('should not emit a DEP0187 deprecation warning for invalid values', () => {
    const code = `
      const exists = require('./utils/exists-sync');
      for (const bad of [undefined, null, {}, [], 42, true]) {
        if (exists(bad) !== false) throw new Error('expected false for ' + String(bad));
      }
    `;
    expect(() => runStrict(code)).to.not.throw();
  });

  // this guards the guard, if node ever stops warning here the test above stops proving anything
  (isNode24 ? it : it.skip)('should be verifiably avoiding a real fs.existsSync deprecation', () => {
    expect(() => runStrict(`require('fs').existsSync(undefined)`)).to.throw(/DeprecationWarning/);
  });
});
