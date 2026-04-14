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
  const {env, stdin, stdout, stderr, ...rest} = overrides;
  return {
    stdin: {isTTY: true, ...stdin},
    stdout: {isTTY: true, columns: 80, rows: 24, ...stdout},
    stderr: {isTTY: true, ...stderr},
    env: env || {},
    landoColorLevel: 3,
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

    it('should forward COLORTERM when set', () => {
      const ctx = makeCtx({env: {COLORTERM: 'truecolor'}});
      const env = buildEnvironment(ctx);
      expect(env.COLORTERM).to.equal('truecolor');
    });

    it('should forward TERM_PROGRAM when set', () => {
      const ctx = makeCtx({env: {TERM_PROGRAM: 'iTerm.app'}});
      const env = buildEnvironment(ctx);
      expect(env.TERM_PROGRAM).to.equal('iTerm.app');
    });

    it('should forward TZ when set', () => {
      const ctx = makeCtx({env: {TZ: 'America/New_York'}});
      const env = buildEnvironment(ctx);
      expect(env.TZ).to.equal('America/New_York');
    });

    it('should forward locale vars when set', () => {
      const ctx = makeCtx({env: {LANG: 'en_US.UTF-8', LC_ALL: 'C', LC_CTYPE: 'UTF-8', LC_MESSAGES: 'en_US'}});
      const env = buildEnvironment(ctx);
      expect(env.LANG).to.equal('en_US.UTF-8');
      expect(env.LC_ALL).to.equal('C');
      expect(env.LC_CTYPE).to.equal('UTF-8');
      expect(env.LC_MESSAGES).to.equal('en_US');
    });

    it('should ignore env vars not in forwardKeys', () => {
      const ctx = makeCtx({env: {TERM: 'xterm', SECRET_TOKEN: 'abc123'}});
      const env = buildEnvironment(ctx);
      expect(env.TERM).to.equal('xterm');
      expect(env).to.not.have.property('SECRET_TOKEN');
    });

    it('should not forward CI env vars', () => {
      const ctx = makeCtx({env: {CI: 'true', GITHUB_ACTIONS: 'true', GITLAB_CI: 'true'}});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('CI');
      expect(env).to.not.have.property('GITHUB_ACTIONS');
      expect(env).to.not.have.property('GITLAB_CI');
    });

    it('should not forward DEBUG or VERBOSE', () => {
      const ctx = makeCtx({env: {DEBUG: '*', VERBOSE: '1'}});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('DEBUG');
      expect(env).to.not.have.property('VERBOSE');
    });

    it('should not forward color env vars from the host', () => {
      const ctx = makeCtx({env: {FORCE_COLOR: '3', NO_COLOR: '1', CLICOLOR: '1', CLICOLOR_FORCE: '1'}});
      const env = buildEnvironment(ctx);
      // Color state is derived from Lando's own chalk level, not host vars
      expect(env).to.not.have.property('FORCE_COLOR');
      expect(env).to.not.have.property('CLICOLOR');
      expect(env).to.not.have.property('CLICOLOR_FORCE');
    });
  });

  describe('color suppression from Lando state', () => {
    it('should set NO_COLOR=1 when Lando is not producing color', () => {
      const ctx = makeCtx({landoColorLevel: 0});
      const env = buildEnvironment(ctx);
      expect(env.NO_COLOR).to.equal('1');
    });

    it('should not set NO_COLOR when Lando is producing color', () => {
      const ctx = makeCtx({landoColorLevel: 3});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('NO_COLOR');
    });

    it('should not set NO_COLOR when Lando has basic color support', () => {
      const ctx = makeCtx({landoColorLevel: 1});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('NO_COLOR');
    });
  });

  describe('synthetic vars', () => {
    it('should set COLUMNS and LINES when stdout is not a TTY', () => {
      const ctx = makeCtx({stdout: {isTTY: false, columns: 120, rows: 40}});
      const env = buildEnvironment(ctx);
      expect(env.COLUMNS).to.equal('120');
      expect(env.LINES).to.equal('40');
    });

    it('should set COLUMNS and LINES when stdin is not a TTY but stdout is', () => {
      const ctx = makeCtx({stdin: {isTTY: false}, stdout: {isTTY: true, columns: 120, rows: 40}});
      const env = buildEnvironment(ctx);
      expect(env.COLUMNS).to.equal('120');
      expect(env.LINES).to.equal('40');
    });

    it('should not set COLUMNS and LINES when both stdin and stdout are TTY', () => {
      const ctx = makeCtx({stdin: {isTTY: true}, stdout: {isTTY: true, columns: 120, rows: 40}});
      const env = buildEnvironment(ctx);
      expect(env).to.not.have.property('COLUMNS');
      expect(env).to.not.have.property('LINES');
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

    it('should let user env override NO_COLOR suppression', () => {
      const ctx = makeCtx({landoColorLevel: 0});
      const env = buildEnvironment(ctx, {NO_COLOR: ''});
      // User explicitly clearing NO_COLOR should win
      expect(env.NO_COLOR).to.equal('');
    });

    it('should let user env force color even when Lando has no color', () => {
      const ctx = makeCtx({landoColorLevel: 0});
      const env = buildEnvironment(ctx, {FORCE_COLOR: '3'});
      // Synthetic NO_COLOR is set, but user FORCE_COLOR is also present
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
        {COLUMNS: '999'},
      );
      // User wins over synthetic
      expect(env.COLUMNS).to.equal('999');
    });
  });
});
