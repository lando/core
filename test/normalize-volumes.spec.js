/*
 * Tests for components/l337-v4 normalizeVolumes.
 * @file normalize-volumes.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
const expect = chai.expect;
chai.should();

const fs = require('fs');
const os = require('os');
const path = require('path');

// Get the module to test
const L337ServiceV4 = require('../components/l337-v4');

describe('l337-v4 normalizeVolumes', () => {
  let appRoot;
  let context;

  // run normalizeVolumes with a minimal stubbed this
  const normalize = volumes => L337ServiceV4.prototype.normalizeVolumes.call(context, volumes);

  beforeEach(() => {
    appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-normalize-volumes-test-'));
    context = {
      _data: {volumes: ['some-named-volume']},
      appRoot,
      debug: () => {},
    };
  });

  afterEach(() => {
    fs.rmSync(appRoot, {force: true, recursive: true});
  });

  it('should return an empty array for non-array input', () => {
    expect(normalize('not-an-array')).to.deep.equal([]);
    expect(normalize({source: 'nope'})).to.deep.equal([]);
  });

  it('should pass through one part strings', () => {
    expect(normalize(['/some/anon/volume'])).to.deep.equal(['/some/anon/volume']);
  });

  it('should normalize two and three part strings into objects', () => {
    const source = path.join(appRoot, 'exists');
    fs.mkdirSync(source);
    const [two, three] = normalize([`${source}:/here`, `${source}:/there:ro`]);
    expect(two).to.deep.equal({source, target: '/here', type: 'bind'});
    expect(three).to.deep.equal({source, target: '/there', type: 'bind', read_only: true});
  });

  it('should resolve relative bind sources from the app root', () => {
    const [volume] = normalize(['./relative:/here']);
    expect(volume.source).to.equal(path.join(appRoot, 'relative'));
    expect(fs.statSync(volume.source).isDirectory()).to.equal(true);
  });

  it('should type named volumes as volumes and not create anything on the host', () => {
    const [volume] = normalize([{source: 'some-named-volume', target: '/here'}]);
    expect(volume.type).to.equal('volume');
    expect(fs.existsSync(path.join(appRoot, 'some-named-volume'))).to.equal(false);
  });

  it('should create missing bind sources as directories', () => {
    const source = path.join(appRoot, 'missing');
    normalize([`${source}:/here`]);
    expect(fs.statSync(source).isDirectory()).to.equal(true);
  });

  it('should not touch bind sources that already exist as files', () => {
    const source = path.join(appRoot, 'config.conf');
    fs.writeFileSync(source, 'config');
    const inode = fs.statSync(source).ino;
    normalize([`${source}:/here`]);
    expect(fs.statSync(source).isFile()).to.equal(true);
    expect(fs.statSync(source).ino).to.equal(inode);
    expect(fs.readFileSync(source, 'utf8')).to.equal('config');
  });

  it('should not create missing bind sources when create_host_path is false', () => {
    const source = path.join(appRoot, 'user-managed.conf');
    const [volume] = normalize([{source, target: '/here', bind: {create_host_path: false}}]);
    expect(fs.existsSync(source)).to.equal(false);
    expect(volume.bind).to.deep.equal({create_host_path: false});
  });

  it('should create missing bind sources when create_host_path is true', () => {
    const source = path.join(appRoot, 'compose-managed');
    normalize([{source, target: '/here', bind: {create_host_path: true}}]);
    expect(fs.statSync(source).isDirectory()).to.equal(true);
  });

  it('should not create anything for host-services sources in the docker vm', () => {
    const sources = ['/run/host-services', '/run/host-services/ssh-auth.sock'];
    const volumes = normalize(sources.map(source => ({source, target: source})));
    for (const [index, source] of sources.entries()) {
      expect(volumes[index].source).to.equal(source);
      expect(fs.existsSync(source)).to.equal(false);
    }
  });
});
