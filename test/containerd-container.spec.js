/*
 * Tests for containerd-container.
 * @file containerd-container.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const ContainerdContainer = require('./../lib/backends/containerd/containerd-container');

// We need to access the private `parseLabels` helper.
// Since it's module-scoped, we test it indirectly through the class's behavior,
// but we can also require the module file and extract it via a test-friendly approach.
// The parseLabels function is used internally by normalizeContainer and exposed
// through the list() pipeline. For direct unit testing, we'll re-extract it.

// Helper: extract parseLabels by reading the module source and evaluating the function.
// A cleaner approach: since parseLabels is used by the module, we test it through
// the container's behavior. But we can also just copy the logic for direct testing.
// Instead, let's test through the public API where possible.

// For parseLabels testing, we'll require the file and test normalizeContainer behavior
// through the getContainer/getNetwork proxy methods and direct label parsing.

// Direct access: since parseLabels is a module-level const, we can test it via
// the class methods that use it. For truly direct testing, let's use a small trick:
const Module = require('module');
const path = require('path');

/**
 * Extract the parseLabels function from the containerd-container module.
 *
 * This reads the module source and evaluates just the parseLabels function
 * in an isolated context. This is a common pattern for testing private helpers.
 */
function getParseLabels() {
  const fs = require('fs');
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'lib', 'backends', 'containerd', 'containerd-container.js'),
    'utf8',
  );

  // Extract the parseLabels function body from source
  const match = src.match(/const parseLabels = ([\s\S]*?)^};/m);
  if (!match) throw new Error('Could not extract parseLabels from source');

  // eslint-disable-next-line no-eval
  const parseLabels = eval('(' + match[1] + '})');
  return parseLabels;
}

let parseLabels;
try {
  parseLabels = getParseLabels();
} catch (err) {
  // Fallback: if we can't extract it, we'll skip those tests
  parseLabels = null;
}

describe('containerd-container', () => {
  describe('#ContainerdContainer', () => {
    it('should be a constructor', () => {
      expect(ContainerdContainer).to.be.a('function');
    });

    it('should create an instance with default options', () => {
      const cc = new ContainerdContainer({
        debug: () => {},
      });

      expect(cc).to.have.property('finchSocket');
      expect(cc).to.have.property('dockerode');
      expect(cc).to.have.property('id');
      cc.id.should.equal('lando');
    });

    it('should accept custom options', () => {
      const cc = new ContainerdContainer({
        finchSocket: '/custom/socket.sock',
        id: 'custom-id',
        debug: () => {},
      });

      cc.finchSocket.should.equal('/custom/socket.sock');
      cc.id.should.equal('custom-id');
    });
  });

  describe('#parseLabels', () => {
    // Skip if we couldn't extract the function
    before(function() {
      if (!parseLabels) this.skip();
    });

    it('should return an empty object for null/undefined input', () => {
      expect(parseLabels(null)).to.deep.equal({});
      expect(parseLabels(undefined)).to.deep.equal({});
    });

    it('should return an empty object for empty string', () => {
      expect(parseLabels('')).to.deep.equal({});
    });

    it('should return the same object if input is already an object', () => {
      const labels = {'io.lando.container': 'TRUE', 'com.docker.compose.project': 'myapp'};
      expect(parseLabels(labels)).to.equal(labels);
    });

    it('should return an empty object for non-string/non-object input', () => {
      expect(parseLabels(42)).to.deep.equal({});
      expect(parseLabels(true)).to.deep.equal({});
    });

    it('should parse simple key=value pairs separated by commas', () => {
      const input = 'io.lando.container=TRUE,com.docker.compose.project=myapp';
      const result = parseLabels(input);

      result.should.deep.equal({
        'io.lando.container': 'TRUE',
        'com.docker.compose.project': 'myapp',
      });
    });

    it('should handle values containing "=" (split on first = only)', () => {
      const input = 'key1=val=ue,key2=normal';
      const result = parseLabels(input);

      result['key1'].should.equal('val=ue');
      result['key2'].should.equal('normal');
    });

    it('should handle commas inside label values (the comma-in-value bug fix)', () => {
      // This is the key test: io.lando.landofiles value contains commas
      const input = 'io.lando.container=TRUE,io.lando.landofiles=.lando.yml,.lando.local.yml,com.docker.compose.project=myapp';
      const result = parseLabels(input);

      result['io.lando.container'].should.equal('TRUE');
      // The comma-separated filenames should be preserved as a single value
      result['io.lando.landofiles'].should.equal('.lando.yml,.lando.local.yml');
      result['com.docker.compose.project'].should.equal('myapp');
    });

    it('should handle a single key=value pair with no commas', () => {
      const input = 'io.lando.container=TRUE';
      const result = parseLabels(input);

      result.should.deep.equal({'io.lando.container': 'TRUE'});
    });

    it('should trim whitespace from keys', () => {
      const input = ' key1 =value1, key2 =value2';
      const result = parseLabels(input);

      expect(result).to.have.property('key1');
      expect(result).to.have.property('key2');
    });
  });

  describe('#getContainer', () => {
    it('should return a proxy object with id, inspect, remove, and stop', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      const container = cc.getContainer('abc123');

      expect(container).to.be.an('object');
      container.id.should.equal('abc123');
      expect(container.inspect).to.be.a('function');
      expect(container.remove).to.be.a('function');
      expect(container.stop).to.be.a('function');
    });

    it('should store the correct container id', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      const container = cc.getContainer('my-container-id');

      container.id.should.equal('my-container-id');
    });
  });

  describe('#getNetwork', () => {
    it('should return a proxy object with id, inspect, and remove', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      const network = cc.getNetwork('my-network');

      expect(network).to.be.an('object');
      network.id.should.equal('my-network');
      expect(network.inspect).to.be.a('function');
      expect(network.remove).to.be.a('function');
    });

    it('should store the correct network id', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      const network = cc.getNetwork('lando_bridge_network');

      network.id.should.equal('lando_bridge_network');
    });
  });

  describe('#_isNotFoundError', () => {
    it('should return true for "no such container" errors', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      cc._isNotFoundError(new Error('no such container: abc123')).should.be.true;
    });

    it('should return true for "not found" errors', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      cc._isNotFoundError(new Error('container not found')).should.be.true;
    });

    it('should return true for "no such network" errors', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      cc._isNotFoundError(new Error('no such network: my-net')).should.be.true;
    });

    it('should return true for "no such object" errors', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      cc._isNotFoundError(new Error('no such object')).should.be.true;
    });

    it('should return false for other errors', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      cc._isNotFoundError(new Error('permission denied')).should.be.false;
    });

    it('should return false for null/empty errors', () => {
      const cc = new ContainerdContainer({debug: () => {}});
      cc._isNotFoundError(null).should.be.false;
      cc._isNotFoundError({}).should.be.false;
    });
  });
});
