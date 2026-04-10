/**
 * Tests for build-exec-environment.js
 * @file build-exec-environment.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const buildEnvironment = require('../utils/build-exec-environment');

describe('build-exec-environment', () => {
  const savedEnv = {};

  beforeEach(() => {
    // Save and clear forwarded env vars to isolate tests
    for (const key of buildEnvironment.forwardKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore env vars
    for (const key of buildEnvironment.forwardKeys) {
      if (savedEnv[key] !== undefined) process.env[key] = savedEnv[key];
      else delete process.env[key];
    }
  });

  describe('inherited vars', () => {
    it('should forward TERM when set', () => {
      process.env.TERM = 'xterm-256color';
      const ctx = {stdout: {isTTY: true}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env.TERM).to.equal('xterm-256color');
    });

    it('should not include TERM when unset', () => {
      const ctx = {stdout: {isTTY: true}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('TERM');
    });

    it('should forward CI when set', () => {
      process.env.CI = 'true';
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, stderr: {isTTY: false}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env.CI).to.equal('true');
    });

    it('should forward DEBUG when set', () => {
      process.env.DEBUG = '*';
      const ctx = {stdout: {isTTY: true}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env.DEBUG).to.equal('*');
    });

    it('should forward TZ when set', () => {
      process.env.TZ = 'America/New_York';
      const ctx = {stdout: {isTTY: true}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env.TZ).to.equal('America/New_York');
    });
  });

  describe('synthetic vars', () => {
    it('should set COLUMNS and LINES when stdout is not a TTY', () => {
      const ctx = {stdout: {isTTY: false, columns: 120, rows: 40}, stderr: {isTTY: false}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env.COLUMNS).to.equal('120');
      expect(env.LINES).to.equal('40');
    });

    it('should not set COLUMNS and LINES when stdout is a TTY', () => {
      const ctx = {stdout: {isTTY: true, columns: 120, rows: 40}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('COLUMNS');
      expect(env).to.not.have.property('LINES');
    });

    it('should not synthetically set CLICOLOR_FORCE when stdout is piped', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx);
      // CLICOLOR_FORCE should not be synthetically set because it affects all streams
      expect(env).to.not.have.property('CLICOLOR_FORCE');
    });

    it('should not override inherited CLICOLOR_FORCE with synthetic', () => {
      process.env.CLICOLOR_FORCE = '3';
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx);
      expect(env.CLICOLOR_FORCE).to.equal('3');
    });
  });

  describe('user overrides', () => {
    it('should let user env override inherited vars', () => {
      process.env.TERM = 'xterm';
      const ctx = {stdout: {isTTY: true}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx, {TERM: 'dumb'});
      expect(env.TERM).to.equal('dumb');
    });

    it('should let user env override synthetic vars', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, stderr: {isTTY: false}, noColor: false};
      const env = buildEnvironment(ctx, {COLUMNS: '200'});
      expect(env.COLUMNS).to.equal('200');
    });

    it('should pass through arbitrary user vars', () => {
      const ctx = {stdout: {isTTY: true}, stderr: {isTTY: true}, noColor: false};
      const env = buildEnvironment(ctx, {MY_APP_VAR: 'hello'});
      expect(env.MY_APP_VAR).to.equal('hello');
    });
  });

  describe('precedence', () => {
    it('should apply inherited < synthetic < user', () => {
      process.env.FORCE_COLOR = '1';
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, stderr: {isTTY: false}, noColor: false};
      const env = buildEnvironment(ctx, {COLUMNS: '999', FORCE_COLOR: '3'});
      // User wins over synthetic
      expect(env.COLUMNS).to.equal('999');
      // User wins over inherited
      expect(env.FORCE_COLOR).to.equal('3');
    });
  });
});
