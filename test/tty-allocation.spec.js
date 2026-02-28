/*
 * Tests for TTY allocation in docker exec and compose.
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

describe('TTY allocation', () => {
  // Save originals
  const originalStdinIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;

  afterEach(() => {
    // Restore after each test
    process.stdin.isTTY = originalStdinIsTTY;
    process.stdout.isTTY = originalStdoutIsTTY;
    // Clear require cache so compose.js re-evaluates
    delete require.cache[require.resolve('./../lib/compose')];
    delete require.cache[require.resolve('./../utils/build-docker-exec')];
  });

  describe('compose exec (lib/compose.js)', () => {
    it('should set noTTY=true when stdout is not a TTY (output redirected)', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = false;
      const compose = require('./../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello']},
      );
      // When noTTY is true, the -T flag should be in the command
      expect(result.cmd).to.include('-T');
    });

    it('should set noTTY=false when both stdin and stdout are TTYs', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = true;
      const compose = require('./../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello']},
      );
      // When both are TTY, -T should NOT be in the command
      expect(result.cmd).to.not.include('-T');
    });

    it('should set noTTY=true when stdin is not a TTY (non-interactive)', () => {
      process.stdin.isTTY = false;
      process.stdout.isTTY = true;
      const compose = require('./../lib/compose');
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
      const compose = require('./../lib/compose');
      const result = compose.run(
        ['docker-compose.yml'],
        'test_project',
        {services: ['web'], cmd: ['echo', 'hello']},
      );
      expect(result.cmd).to.include('-T');
    });
  });

  describe('docker exec (utils/build-docker-exec.js)', () => {
    it('should not include --tty when stdout is not a TTY', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = false;
      const buildDockerExec = require('./../utils/build-docker-exec');

      let capturedCmd;
      const injected = {
        config: {dockerBin: 'docker'},
        _config: {dockerBin: 'docker'},
        shell: {
          sh: (cmd, opts) => {
            capturedCmd = cmd;
            return Promise.resolve();
          },
        },
      };

      const datum = {
        id: 'test_container',
        cmd: ['echo', 'hello'],
        opts: {user: 'www-data', environment: {}},
      };

      buildDockerExec(injected, 'inherit', datum);
      expect(capturedCmd).to.not.include('--tty');
    });

    it('should include --tty when both stdin and stdout are TTYs', () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = true;
      const buildDockerExec = require('./../utils/build-docker-exec');

      let capturedCmd;
      const injected = {
        config: {dockerBin: 'docker'},
        _config: {dockerBin: 'docker'},
        shell: {
          sh: (cmd, opts) => {
            capturedCmd = cmd;
            return Promise.resolve();
          },
        },
      };

      const datum = {
        id: 'test_container',
        cmd: ['echo', 'hello'],
        opts: {user: 'www-data', environment: {}},
      };

      buildDockerExec(injected, 'inherit', datum);
      expect(capturedCmd).to.include('--tty');
    });
  });
});
