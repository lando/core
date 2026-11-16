/**
 * Tests for plugin system.
 * @file plugins.spec.js
 */

'use strict';

// Setup chai.
const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const filesystem = require('mock-fs');
chai.use(require('chai-as-promised'));
chai.should();
const os = require('os');
const path = require('path');
const Plugins = require('./../lib/plugins');

const testPlugin = path.resolve(__dirname, '..', 'examples', 'plugins', 'test-plugin-2', 'index.js');
const searchDirs = [
  path.join(os.tmpdir(), 'dir1'),
  path.join(os.tmpdir(), 'dir2'),
  path.join(os.tmpdir(), 'dir3'),
];

const fsConfig = {};
_.forEach(searchDirs, dir => {
  fsConfig[path.resolve(dir, 'plugins', 'test', 'index.js')] = filesystem.load(testPlugin);
  fsConfig[path.resolve(dir, 'plugins', 'test', 'plugin.yml')] = 'DONT MATTER';
});

// This is the file we are testing
describe('plugins', () => {
  describe('#find Upsun replacement', () => {
    const root = path.join(os.tmpdir(), 'upsun-plugin-test');
    const dirs = [
      {path: root, subdir: 'installed', namespace: '@lando'},
      {path: root, subdir: 'development'},
    ];
    let files;
    let log;
    const addPlugin = (directory, packageName, source = 'installed') => {
      const dir = path.join(root, source, directory);
      files[path.join(dir, 'index.js')] = 'module.exports = () => ({});';
      files[path.join(dir, 'package.json')] = JSON.stringify({name: packageName});
      files[path.join(dir, 'builders', 'platformsh.js')] = 'module.exports = () => ({});';
      return dir;
    };
    const find = options => {
      filesystem(files);
      return new Plugins(log).find(dirs, options);
    };

    beforeEach(() => {
      files = {};
      log = {warn: sinon.spy()};
    });

    afterEach(() => filesystem.restore());

    it('loads legacy-only installs unchanged', () => {
      addPlugin('platformsh', '@lando/platformsh');
      find().map(plugin => plugin.name).should.deep.equal(['@lando/platformsh']);
      log.warn.callCount.should.equal(0);
    });

    it('suppresses the legacy implementation without changing its files or credentials', () => {
      const legacy = addPlugin('platformsh', '@lando/platformsh');
      addPlugin('upsun', '@lando/upsun');
      const credentials = path.join(root, 'cache', 'platformsh.tokens');
      files[credentials] = 'saved-token-cache';
      find().map(plugin => plugin.name).should.deep.equal(['@lando/upsun']);
      require('fs').readFileSync(path.join(legacy, 'package.json'), 'utf8')
        .should.equal(JSON.stringify({name: '@lando/platformsh'}));
      require('fs').readFileSync(credentials, 'utf8').should.equal('saved-token-cache');
      log.warn.callCount.should.equal(1);
    });

    it('does not suppress legacy when Upsun is disabled', () => {
      addPlugin('platformsh', '@lando/platformsh');
      addPlugin('upsun', '@lando/upsun');
      find({disablePlugins: ['@lando/upsun']}).map(plugin => plugin.name)
        .should.deep.equal(['@lando/platformsh']);
    });

    it('does not suppress legacy for an Upsun install without its entrypoint', () => {
      addPlugin('platformsh', '@lando/platformsh');
      const upsun = addPlugin('upsun', '@lando/upsun');
      delete files[path.join(upsun, 'index.js')];
      find().map(plugin => plugin.name).should.deep.equal(['@lando/platformsh']);
    });

    it('does not identify malformed package metadata as a replacement', () => {
      addPlugin('platformsh', '@lando/platformsh');
      const upsun = addPlugin('upsun', '@lando/upsun');
      files[path.join(upsun, 'package.json')] = '{';
      find().map(plugin => plugin.name).should.include('@lando/platformsh');
      log.warn.callCount.should.equal(0);
    });

    it('recognizes an Upsun development checkout still in a platformsh directory', () => {
      addPlugin('platformsh', '@lando/platformsh');
      const development = addPlugin('platformsh', '@lando/upsun', 'development');
      const plugins = find();
      plugins.should.have.lengthOf(1);
      plugins[0].dir.should.equal(development);
      plugins[0].builders.should.equal(path.join(development, 'builders'));
    });

    it('suppresses unnamespaced legacy checkouts using package identity', () => {
      addPlugin('upsun', '@lando/upsun');
      addPlugin('platformsh', '@lando/platformsh', 'development');
      find().map(plugin => plugin.name).should.deep.equal(['@lando/upsun']);
    });

    it('preserves unrelated plugins whose directory happens to be platformsh', () => {
      addPlugin('upsun', '@lando/upsun');
      addPlugin('platformsh', '@example/custom', 'development');
      find().map(plugin => plugin.name).should.deep.equal(['@lando/upsun', 'platformsh']);
    });

    it('keeps only the last Upsun candidate across installed and development locations', () => {
      addPlugin('upsun', '@lando/upsun');
      const development = addPlugin('upsun', '@lando/upsun', 'development');
      const plugins = find();
      plugins.should.have.lengthOf(1);
      plugins[0].dir.should.equal(development);
    });

    it('handles explicit local plugins and respects their disabled discovery names', () => {
      addPlugin('platformsh', '@lando/platformsh');
      const local = addPlugin('checkout', '@lando/upsun', 'local');
      find({plugins: [{name: 'my-upsun', type: 'local', path: local}]}).map(plugin => plugin.name)
        .should.deep.equal(['my-upsun']);
      filesystem.restore();
      find({plugins: [{name: 'my-upsun', type: 'local', path: local}], disablePlugins: ['my-upsun']})
        .map(plugin => plugin.name).should.deep.equal(['@lando/platformsh']);
    });
  });

  describe('#load', () => {
    beforeEach(() => {
      filesystem(fsConfig);
      delete global.__webpack_require__;
      delete global.__non_webpack_require__;
    });

    it('should use __non_webpack_require__ if __webpack_require__ is a func', () => {
      filesystem.restore();
      const plugins = new Plugins();
      const find = plugins.find([path.resolve(__dirname, '..', 'examples', 'plugins')]);
      global.__webpack_require__ = sinon.spy();
      global.__non_webpack_require__ = require;
      const data = plugins.load(find[0]);
      data.should.be.an('Object');
      data.data['app-plugin-test'].should.be.true;
      data.name.should.equal(find[0].name);
      data.path.should.equal(find[0].path);
      data.dir.should.equal(find[0].dir);
    });

    it('should use the plugin from the last location it finds it', () => {
      const plugins = new Plugins();
      const find = plugins.find(searchDirs);
      find[0].dir.should.match(/dir3\/plugins\/test$/);
    });

    it('should push a plugin to the plugin registry after it is loaded', () => {
      const plugins = new Plugins();
      const find = plugins.find(searchDirs);
      global.__webpack_require__ = sinon.spy();
      global.__non_webpack_require__ = require;
      plugins.load(find[0]);
      plugins.registry.should.be.lengthOf(1);
    });

    it('should throw an error if dynamic require fails', () => {
      filesystem();
      const plugins = new Plugins({
        silly: sinon.spy(),
        debug: sinon.spy(),
        error: sinon.spy(),
        verbose: sinon.spy(),
      });
      plugins.load({name: 'something'}, 'somewhere', {});
      plugins.log.error.callCount.should.equal(1);
    });

    afterEach(() => {
      filesystem.restore();
    });
  });
});
