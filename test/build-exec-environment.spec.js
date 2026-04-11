/**
 * Tests for build-exec-environment.js
 * @file build-exec-environment.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const buildEnvironment = require('../utils/build-exec-environment');

// Helper — build a context with a controlled env so tests never
// touch process.env and don't need save/restore boilerplate.
const makeCtx = (overrides = {}) => {
  const {env, stdout, stderr, ...rest} = overrides;
  return {
    stdout: {isTTY: true, columns: 80, rows: 24, ...stdout},
    stderr: {isTTY: true, ...stderr},
    env: env || {},
    noColor: false,
    ...rest,
  };
};

describe('build-exec-environment', () => {
  describe('inherited vars', () => {
    it('should forward TERM when set', () => {
      const ctx = makeCtx({env: {TERM: 'xterm-256color'}});
      const env = buildEnvironment(ctx);
      expect(env.TERM).to.equal('xterm-256color');
    });

    it('should not include TERM when unset', () => {
      const ctx = makeCtx();
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('TERM');
    });

    it('should forward CI when set', () => {
      const ctx = makeCtx({env: {CI: 'true'}, stdout: {isTTY: false, columns: 80, rows: 24}});
      const env = buildEnvironment(ctx);
      expect(env.CI).to.equal('true');
    });

    it('should forward DEBUG when set', () => {
      const ctx = makeCtx({env: {DEBUG: '*'}});
      const env = buildEnvironment(ctx);
      expect(env.DEBUG).to.equal('*');
    });

    it('should forward TZ when set', () => {
      const ctx = makeCtx({env: {TZ: 'America/New_York'}});
      const env = buildEnvironment(ctx);
      expect(env.TZ).to.equal('America/New_York');
    });

    it('should forward FORCE_COLOR when stdout is a TTY', () => {
      const ctx = makeCtx({env: {FORCE_COLOR: '1'}});
      const env = buildEnvironment(ctx);
      expect(env.FORCE_COLOR).to.equal('1');
    });

    it('should not forward FORCE_COLOR when stdout is not a TTY', () => {
      const ctx = makeCtx({env: {FORCE_COLOR: '1'}, stdout: {isTTY: false, columns: 80, rows: 24}});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('FORCE_COLOR');
    });

    it('should not forward CLICOLOR_FORCE when stdout is not a TTY', () => {
      const ctx = makeCtx({env: {CLICOLOR_FORCE: '3'}, stdout: {isTTY: false, columns: 80, rows: 24}});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('CLICOLOR_FORCE');
    });

    it('should still forward NO_COLOR when stdout is not a TTY', () => {
      const ctx = makeCtx({env: {NO_COLOR: '1'}, stdout: {isTTY: false, columns: 80, rows: 24}, noColor: true});
      const env = buildEnvironment(ctx);
      expect(env.NO_COLOR).to.equal('1');
    });

    it('should ignore env vars not in forwardKeys', () => {
      const ctx = makeCtx({env: {TERM: 'xterm', SECRET_TOKEN: 'abc123'}});
      const env = buildEnvironment(ctx);
      expect(env.TERM).to.equal('xterm');
      expect(env).to.not.have.property('SECRET_TOKEN');
    });
  });

  describe('synthetic vars', () => {
    it('should set COLUMNS and LINES when stdout is not a TTY', () => {
      const ctx = makeCtx({stdout: {isTTY: false, columns: 120, rows: 40}});
      const env = buildEnvironment(ctx);
      expect(env.COLUMNS).to.equal('120');
      expect(env.LINES).to.equal('40');
    });

    it('should not set COLUMNS and LINES when stdout is a TTY', () => {
      const ctx = makeCtx({stdout: {isTTY: true, columns: 120, rows: 40}});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('COLUMNS');
      expect(env).to.not.have.property('LINES');
    });

    it('should not synthetically set CLICOLOR_FORCE when stdout is piped', () => {
      const ctx = makeCtx({stdout: {isTTY: false, columns: 80, rows: 24}, stderr: {isTTY: true}});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('CLICOLOR_FORCE');
    });
  });

  describe('user overrides', () => {
    it('should let user env override inherited vars', () => {
      const ctx = makeCtx({env: {TERM: 'xterm'}});
      const env = buildEnvironment(ctx, {TERM: 'dumb'});
      expect(env.TERM).to.equal('dumb');
    });

    it('should let user env override synthetic vars', () => {
      const ctx = makeCtx({stdout: {isTTY: false, columns: 80, rows: 24}});
      const env = buildEnvironment(ctx, {COLUMNS: '200'});
      expect(env.COLUMNS).to.equal('200');
    });

    it('should let user env force color vars even when stdout is not a TTY', () => {
      const ctx = makeCtx({env: {FORCE_COLOR: '1'}, stdout: {isTTY: false, columns: 80, rows: 24}});
      const env = buildEnvironment(ctx, {FORCE_COLOR: '3'});
      // Inherited FORCE_COLOR is skipped, but explicit user override wins
      expect(env.FORCE_COLOR).to.equal('3');
    });

    it('should pass through arbitrary user vars', () => {
      const ctx = makeCtx();
      const env = buildEnvironment(ctx, {MY_APP_VAR: 'hello'});
      expect(env.MY_APP_VAR).to.equal('hello');
    });
  });

  describe('precedence', () => {
    it('should apply inherited < synthetic < user', () => {
      const env = buildEnvironment(
        makeCtx({stdout: {isTTY: false, columns: 80, rows: 24}}),
        {COLUMNS: '999', FORCE_COLOR: '3'},
      );
      // User wins over synthetic
      expect(env.COLUMNS).to.equal('999');
      // User wins (FORCE_COLOR not inherited because !isTTY, but user sets it)
      expect(env.FORCE_COLOR).to.equal('3');
    });
  });
});
