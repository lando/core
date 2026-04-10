/**
 * Tests for TTY allocation in docker exec and compose exec.
 * @file tty-allocation.spec.js
 *
 * Validates that TTY is only allocated when BOTH stdin and stdout
 * are TTYs. When stdout is redirected (e.g. `lando foo > file.txt`),
 * TTY should NOT be allocated so that ANSI escape codes are not
 * written to the file.
 *
 * @see https://github.com/lando/core/issues/345
 * @see https://github.com/lando/drupal/issues/157
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const {buildExecArgs} = require('../utils/build-docker-exec');

// Helper to build a minimal context object for testing
const makeContext = (overrides = {}) => {
  const {stdin, stdout, stderr, ...rest} = overrides;

  return {
    stdin: {isTTY: false, isClosed: false, ...stdin},
    stdout: {isTTY: false, columns: 80, rows: 24, ...stdout},
    stderr: {isTTY: false, ...stderr},
    isNodeMode: true,
    ci: false,
    noColor: false,
    forceColor: undefined,
    ...rest,
  };
};

// Helper to build a minimal datum object for testing
const makeDatum = (overrides = {}) => ({
  id: 'test_container',
  cmd: ['echo', 'hello'],
  opts: {user: 'www-data', environment: {}, ...overrides.opts},
  ...overrides,
});

describe('TTY allocation', () => {
  describe('docker exec (utils/build-docker-exec.js)', () => {
    it('should include --tty when both stdin and stdout are TTYs', () => {
      const ctx = makeContext({stdin: {isTTY: true}, stdout: {isTTY: true}});
      const args = buildExecArgs('docker', makeDatum(), ctx);
      expect(args).to.include('--tty');
    });

    it('should not include --tty when stdout is not a TTY (output redirected)', () => {
      const ctx = makeContext({stdin: {isTTY: true}, stdout: {isTTY: false}});
      const args = buildExecArgs('docker', makeDatum(), ctx);
      expect(args).to.not.include('--tty');
    });

    it('should not include --tty when stdin is not a TTY', () => {
      const ctx = makeContext({stdin: {isTTY: false}, stdout: {isTTY: true}});
      const args = buildExecArgs('docker', makeDatum(), ctx);
      expect(args).to.not.include('--tty');
    });

    it('should not include --tty when neither stdin nor stdout is a TTY', () => {
      const ctx = makeContext({stdin: {isTTY: false}, stdout: {isTTY: false}});
      const args = buildExecArgs('docker', makeDatum(), ctx);
      expect(args).to.not.include('--tty');
    });
  });

  describe('interactive mode', () => {
    it('should include --interactive in node mode', () => {
      const ctx = makeContext({isNodeMode: true});
      const args = buildExecArgs('docker', makeDatum(), ctx);
      expect(args).to.include('--interactive');
    });

    it('should not include --interactive outside node mode', () => {
      const ctx = makeContext({isNodeMode: false});
      const args = buildExecArgs('docker', makeDatum(), ctx);
      expect(args).to.not.include('--interactive');
    });

    it('should not include --interactive when stdin is closed', () => {
      const ctx = makeContext({isNodeMode: true, stdin: {isTTY: true, isClosed: true}});
      const args = buildExecArgs('docker', makeDatum(), ctx);
      expect(args).to.not.include('--interactive');
    });

    it('should not include --interactive when detaching', () => {
      const ctx = makeContext({isNodeMode: true});
      const datum = makeDatum({cmd: ['sleep', '100', '&']});
      const args = buildExecArgs('docker', datum, ctx);
      expect(args).to.include('--detach');
      expect(args).to.not.include('--interactive');
    });
  });

  describe('detach handling', () => {
    it('should detect trailing & and add --detach', () => {
      const ctx = makeContext();
      const datum = makeDatum({cmd: ['sleep', '100', '&']});
      const args = buildExecArgs('docker', datum, ctx);
      expect(args).to.include('--detach');
      expect(args).to.not.include('&');
    });

    it('should detect appended & in shell wrappers and add --detach', () => {
      const ctx = makeContext();
      const datum = makeDatum({cmd: ['/bin/sh', '-c', 'sleep 100&']});
      const args = buildExecArgs('docker', datum, ctx);
      expect(args).to.include('--detach');
    });

    it('should not include --tty when detaching', () => {
      const ctx = makeContext({stdin: {isTTY: true}, stdout: {isTTY: true}});
      const datum = makeDatum({cmd: ['sleep', '100', '&']});
      const args = buildExecArgs('docker', datum, ctx);
      expect(args).to.include('--detach');
      expect(args).to.not.include('--tty');
    });
  });

  describe('command assembly', () => {
    it('should include workdir when set', () => {
      const ctx = makeContext();
      const datum = makeDatum({opts: {user: 'root', environment: {}, workdir: '/app'}});
      const args = buildExecArgs('docker', datum, ctx);
      const wdIdx = args.indexOf('--workdir');
      expect(wdIdx).to.be.greaterThan(-1);
      expect(args[wdIdx + 1]).to.equal('/app');
    });

    it('should include user', () => {
      const ctx = makeContext();
      const datum = makeDatum({opts: {user: 'root', environment: {}}});
      const args = buildExecArgs('docker', datum, ctx);
      const uIdx = args.indexOf('--user');
      expect(uIdx).to.be.greaterThan(-1);
      expect(args[uIdx + 1]).to.equal('root');
    });

    it('should include environment variables', () => {
      const ctx = makeContext();
      const datum = makeDatum({opts: {user: 'root', environment: {FOO: 'bar'}}});
      const args = buildExecArgs('docker', datum, ctx);
      expect(args).to.include('--env');
      expect(args).to.include('FOO=bar');
    });

    it('should place container id before the command', () => {
      const ctx = makeContext();
      const datum = makeDatum();
      const args = buildExecArgs('docker', datum, ctx);
      const idIdx = args.indexOf('test_container');
      const cmdIdx = args.indexOf('echo');
      expect(idIdx).to.be.greaterThan(-1);
      expect(cmdIdx).to.be.greaterThan(idIdx);
    });

    it('should use the specified docker binary', () => {
      const ctx = makeContext();
      const args = buildExecArgs('/usr/local/bin/docker', makeDatum(), ctx);
      expect(args[0]).to.equal('/usr/local/bin/docker');
      expect(args[1]).to.equal('exec');
    });
  });

  describe('compose exec (lib/compose.js)', () => {
    const originalStdinIsTTY = process.stdin.isTTY;
    const originalStdoutIsTTY = process.stdout.isTTY;

    afterEach(() => {
      process.stdin.isTTY = originalStdinIsTTY;
      process.stdout.isTTY = originalStdoutIsTTY;
    });

    it('should set noTTY=true when stdout is not a TTY (output redirected)', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = false;
      const compose = require('../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello']},
      );
      expect(result.cmd).to.include('-T');
    });

    it('should set noTTY=false when both stdin and stdout are TTYs', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = true;
      const compose = require('../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello']},
      );
      expect(result.cmd).to.not.include('-T');
    });

    it('should set noTTY=true when stdin is not a TTY (non-interactive)', () => {
      process.stdin.isTTY = false;
      process.stdout.isTTY = true;
      const compose = require('../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello']},
      );
      expect(result.cmd).to.include('-T');
    });

    it('should set noTTY=true when neither stdin nor stdout is a TTY', () => {
      process.stdin.isTTY = false;
      process.stdout.isTTY = false;
      const compose = require('../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello']},
      );
      expect(result.cmd).to.include('-T');
    });

    it('should allow explicit noTTY override', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = true;
      const compose = require('../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello'], noTTY: true},
      );
      expect(result.cmd).to.include('-T');
    });

    it('should detect detach from trailing & in command and force noTTY', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = true;
      const compose = require('../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['sleep', '100', '&']},
      );
      expect(result.cmd).to.include('--detach');
      expect(result.cmd).to.include('-T');
    });
  });
});
