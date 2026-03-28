'use strict';

const {expect} = require('chai'); // eslint-disable-line

const validTypes = ['error', 'warning', 'tip'];

// Messages that take no arguments
const noArgMessages = [
  {name: 'containerd-not-running', file: '../messages/containerd-not-running'},
  {name: 'buildkitd-not-running', file: '../messages/buildkitd-not-running'},
  {name: 'containerd-binaries-not-found', file: '../messages/containerd-binaries-not-found'},
  {name: 'lima-not-installed', file: '../messages/lima-not-installed'},
  {name: 'lima-vm-not-running', file: '../messages/lima-vm-not-running'},
  {name: 'containerd-permission-denied', file: '../messages/containerd-permission-denied'},
  {name: 'containerd-socket-conflict', file: '../messages/containerd-socket-conflict'},
  {name: 'finch-daemon-not-running', file: '../messages/finch-daemon-not-running'},
];

// Messages that take a string argument
const paramMessages = [
  {name: 'compose-failed-containerd', file: '../messages/compose-failed-containerd'},
];

describe('containerd error/warning messages', () => {
  describe('no-argument messages', () => {
    for (const {name, file} of noArgMessages) {
      describe(name, () => {
        let result;

        before(() => {
          const messageFn = require(file);
          result = messageFn();
        });

        it('should return an object with title, type, detail, and url', () => {
          expect(result).to.have.property('title').that.is.a('string').and.is.not.empty;
          expect(result).to.have.property('type').that.is.a('string');
          expect(result).to.have.property('detail').that.is.an('array');
          expect(result).to.have.property('url').that.is.a('string').and.is.not.empty;
        });

        it('should have a valid type', () => {
          expect(validTypes).to.include(result.type);
        });

        it('should have detail as an array of strings', () => {
          expect(result.detail).to.be.an('array').that.is.not.empty;
          for (const line of result.detail) {
            expect(line).to.be.a('string');
          }
        });

        it('should have a url starting with https://', () => {
          expect(result.url).to.match(/^https:\/\//);
        });
      });
    }
  });

  describe('parameterized messages', () => {
    for (const {name, file} of paramMessages) {
      describe(name, () => {
        const testMessage = 'Something went wrong during compose up';
        let result;

        before(() => {
          const messageFn = require(file);
          result = messageFn(testMessage);
        });

        it('should return an object with title, type, detail, and url', () => {
          expect(result).to.have.property('title').that.is.a('string').and.is.not.empty;
          expect(result).to.have.property('type').that.is.a('string');
          expect(result).to.have.property('detail').that.is.an('array');
          expect(result).to.have.property('url').that.is.a('string').and.is.not.empty;
        });

        it('should have a valid type', () => {
          expect(validTypes).to.include(result.type);
        });

        it('should have detail as an array of strings', () => {
          expect(result.detail).to.be.an('array').that.is.not.empty;
          for (const line of result.detail) {
            expect(line).to.be.a('string');
          }
        });

        it('should include the parameter in detail', () => {
          const detailText = result.detail.join(' ');
          expect(detailText).to.include(testMessage);
        });

        it('should have a url starting with https://', () => {
          expect(result.url).to.match(/^https:\/\//);
        });
      });
    }
  });
});
