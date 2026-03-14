/*
 * Tests for resolve-containerd-mount.
 * @file resolve-containerd-mount.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
const path = require('path');
chai.should();

const {resolveContainerdMount, isPathAccessible} = require('./../utils/resolve-containerd-mount');

describe('resolve-containerd-mount', () => {
  describe('#resolveContainerdMount', () => {
    describe('Linux platform', () => {
      it('should mark all paths as accessible', () => {
        const result = resolveContainerdMount('/tmp/myproject', {platform: 'linux'});
        result.accessible.should.be.true;
        expect(result.warning).to.be.null;
      });

      it('should leave paths unchanged', () => {
        const result = resolveContainerdMount('/opt/code', {platform: 'linux'});
        result.resolvedPath.should.equal('/opt/code');
      });

      it('should not produce warnings for any path', () => {
        const paths = ['/tmp/myproject', '/opt/code', '/var/data', '/home/user/app'];
        paths.forEach(p => {
          const result = resolveContainerdMount(p, {platform: 'linux'});
          result.accessible.should.be.true;
          expect(result.warning).to.be.null;
        });
      });
    });

    describe('macOS/darwin platform', () => {
      const darwinOpts = {platform: 'darwin', homedir: '/Users/me'};

      it('should mark paths under homedir as accessible', () => {
        const result = resolveContainerdMount('/Users/me/code', darwinOpts);
        result.accessible.should.be.true;
        expect(result.warning).to.be.null;
        result.resolvedPath.should.equal('/Users/me/code');
      });

      it('should mark paths outside homedir as inaccessible with warning', () => {
        const result = resolveContainerdMount('/tmp/myproject', darwinOpts);
        result.accessible.should.be.false;
        result.warning.should.be.a('string');
        result.warning.should.include('/tmp/myproject');
        result.warning.should.include('Lima');
      });

      it('should mark /opt/code as inaccessible', () => {
        const result = resolveContainerdMount('/opt/code', darwinOpts);
        result.accessible.should.be.false;
        result.warning.should.be.a('string');
      });

      it('should expand tilde to homedir and mark as accessible', () => {
        const result = resolveContainerdMount('~/code', darwinOpts);
        result.accessible.should.be.true;
        result.resolvedPath.should.equal('/Users/me/code');
        expect(result.warning).to.be.null;
      });

      it('should expand tilde for nested paths', () => {
        const result = resolveContainerdMount('~/projects/app/src', darwinOpts);
        result.accessible.should.be.true;
        result.resolvedPath.should.equal('/Users/me/projects/app/src');
      });

      it('should use custom limaMounts to allow paths outside homedir', () => {
        const opts = {
          ...darwinOpts,
          limaMounts: [{location: '/data'}],
        };
        const result = resolveContainerdMount('/data/app', opts);
        result.accessible.should.be.true;
        expect(result.warning).to.be.null;
      });

      it('should reject paths not matching custom limaMounts', () => {
        const opts = {
          ...darwinOpts,
          limaMounts: [{location: '/data'}],
        };
        const result = resolveContainerdMount('/tmp/other', opts);
        result.accessible.should.be.false;
        result.warning.should.be.a('string');
      });
    });

    describe('WSL/win32 platform', () => {
      it('should mark all paths as accessible', () => {
        const result = resolveContainerdMount('/mnt/c/Users/me/project', {platform: 'win32'});
        result.accessible.should.be.true;
        expect(result.warning).to.be.null;
      });

      it('should mark arbitrary paths as accessible', () => {
        const result = resolveContainerdMount('/tmp/data', {platform: 'win32'});
        result.accessible.should.be.true;
        expect(result.warning).to.be.null;
      });
    });

    describe('edge cases', () => {
      it('should return accessible=false with warning for empty string', () => {
        const result = resolveContainerdMount('', {platform: 'linux'});
        result.accessible.should.be.false;
        result.warning.should.be.a('string');
      });

      it('should return accessible=false with warning for null', () => {
        const result = resolveContainerdMount(null, {platform: 'linux'});
        result.accessible.should.be.false;
        result.warning.should.be.a('string');
      });

      it('should return accessible=false with warning for undefined', () => {
        const result = resolveContainerdMount(undefined, {platform: 'linux'});
        result.accessible.should.be.false;
        result.warning.should.be.a('string');
      });

      it('should resolve relative paths to absolute', () => {
        const result = resolveContainerdMount('src/app', {platform: 'linux'});
        result.accessible.should.be.true;
        path.isAbsolute(result.resolvedPath).should.be.true;
        result.resolvedPath.should.equal(path.resolve('src/app'));
      });
    });
  });

  describe('#isPathAccessible', () => {
    it('should return true for accessible paths', () => {
      isPathAccessible('/home/user/code', {platform: 'linux'}).should.be.true;
    });

    it('should return false for inaccessible paths', () => {
      isPathAccessible('/tmp/myproject', {platform: 'darwin', homedir: '/Users/me'}).should.be.false;
    });

    it('should match resolveContainerdMount result', () => {
      const testCases = [
        {path: '/Users/me/code', opts: {platform: 'darwin', homedir: '/Users/me'}},
        {path: '/tmp/outside', opts: {platform: 'darwin', homedir: '/Users/me'}},
        {path: '/opt/data', opts: {platform: 'linux'}},
        {path: '~/projects', opts: {platform: 'darwin', homedir: '/Users/me'}},
      ];

      testCases.forEach(tc => {
        const full = resolveContainerdMount(tc.path, tc.opts);
        const quick = isPathAccessible(tc.path, tc.opts);
        expect(quick).to.equal(full.accessible);
      });
    });
  });
});
