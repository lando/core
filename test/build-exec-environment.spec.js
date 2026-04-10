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
      const ctx = {stdout: {isTTY: true}, env: {TERM: 'xterm-256color'}};
      const env = buildEnvironment(ctx);
      expect(env.TERM).to.equal('xterm-256color');
    });

    it('should not include TERM when unset', () => {
      const ctx = {stdout: {isTTY: true}, env: {}};
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('TERM');
    });

    it('should forward CI when set', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, env: {CI: 'true'}};
      const env = buildEnvironment(ctx);
      expect(env.CI).to.equal('true');
    });

    it('should forward DEBUG when set', () => {
      const ctx = {stdout: {isTTY: true}, env: {DEBUG: '*'}};
      const env = buildEnvironment(ctx);
      expect(env.DEBUG).to.equal('*');
    });

    it('should forward TZ when set', () => {
      const ctx = {stdout: {isTTY: true}, env: {TZ: 'America/New_York'}};
      const env = buildEnvironment(ctx);
      expect(env.TZ).to.equal('America/New_York');
    });

    it('should not forward FORCE_COLOR when stdout is not a TTY', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, env: {FORCE_COLOR: '1'}};
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('FORCE_COLOR');
    });

    it('should not forward CLICOLOR_FORCE when stdout is not a TTY', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, env: {CLICOLOR_FORCE: '3'}};
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('CLICOLOR_FORCE');
    });

    it('should still forward NO_COLOR when stdout is not a TTY', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, env: {NO_COLOR: '1'}};
      const env = buildEnvironment(ctx);
      expect(env.NO_COLOR).to.equal('1');
    });
  });

  describe('synthetic vars', () => {
    it('should set COLUMNS and LINES when stdout is not a TTY', () => {
      const ctx = {stdout: {isTTY: false, columns: 120, rows: 40}, env: {}};
      const env = buildEnvironment(ctx);
      expect(env.COLUMNS).to.equal('120');
      expect(env.LINES).to.equal('40');
    });

    it('should not set COLUMNS and LINES when stdout is a TTY', () => {
      const ctx = {stdout: {isTTY: true, columns: 120, rows: 40}, env: {}};
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('COLUMNS');
      expect(env).to.not.have.property('LINES');
    });

    it('should not synthetically set CLICOLOR_FORCE when stdout is piped', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, env: {}};
      const env = buildEnvironment(ctx);
      // CLICOLOR_FORCE affects all streams, not just stderr.
      expect(env).to.not.have.property('CLICOLOR_FORCE');
    });
  });

  describe('user overrides', () => {
    it('should let user env override inherited vars', () => {
      const ctx = {stdout: {isTTY: true}, env: {TERM: 'xterm'}};
      const env = buildEnvironment(ctx, {TERM: 'dumb'});
      expect(env.TERM).to.equal('dumb');
    });

    it('should let user env override synthetic vars', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, env: {}};
      const env = buildEnvironment(ctx, {COLUMNS: '200'});
      expect(env.COLUMNS).to.equal('200');
    });

    it('should pass through arbitrary user vars', () => {
      const ctx = {stdout: {isTTY: true}, env: {}};
      const env = buildEnvironment(ctx, {MY_APP_VAR: 'hello'});
      expect(env.MY_APP_VAR).to.equal('hello');
    });
  });

  describe('precedence', () => {
    it('should apply inherited < synthetic < user', () => {
      const ctx = {stdout: {isTTY: false, columns: 80, rows: 24}, env: {FORCE_COLOR: '1'}};
      const env = buildEnvironment(ctx, {COLUMNS: '999', FORCE_COLOR: '3'});
      // User wins over synthetic
      expect(env.COLUMNS).to.equal('999');
      // User wins over inherited
      expect(env.FORCE_COLOR).to.equal('3');
    });
  });
});
