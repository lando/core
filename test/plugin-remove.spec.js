/**
 * Tests removal of plugins replaced by Upsun.
 * @file plugin-remove.spec.js
 */

'use strict';

const {expect} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const Plugin = require('../components/plugin');
const Plugins = require('../lib/plugins');
const Log = require('../lib/logger');
const pluginRemove = require('../tasks/plugin-remove');

describe('plugin-remove after Upsun migration', () => {
  let root;
  let debug;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-upsun-remove-'));
    debug = Plugin.debug;
    sinon.stub(console, 'log');
    for (const name of ['platformsh', 'upsun']) {
      const dir = path.join(root, 'plugins', name);
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = () => ({});');
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({name: `@lando/${name}`, version: '1.0.0'}));
    }
  });

  afterEach(() => {
    Plugin.debug = debug;
    console.log.restore();
    fs.rmSync(root, {recursive: true, force: true});
  });

  it('removes suppressed Platform.sh while preserving Upsun and saved credentials', async () => {
    const log = new Log({logLevelConsole: 'error'});
    const plugins = new Plugins(log);
    const pluginDirs = [{path: root, namespace: '@lando'}];
    const active = plugins.find(pluginDirs);
    expect(active.map(plugin => plugin.name)).to.deep.equal(['@lando/upsun']);
    const credentials = path.join(root, 'platformsh.tokens');
    fs.writeFileSync(credentials, 'saved-token-cache');
    const clearTaskCaches = sinon.spy();
    const lando = {
      log,
      plugins,
      config: {pluginDirs, plugins: active},
      cli: {clearTaskCaches},
      runTasks: async tasks => {
        const ctx = {errors: [], results: []};
        for (const task of tasks) await task.task(ctx, {skip: sinon.spy()});
        return {...ctx, total: tasks.length};
      },
    };

    await pluginRemove(lando).run({_: ['plugin-remove', '@lando/platformsh']});

    expect(fs.existsSync(path.join(root, 'plugins', 'platformsh'))).to.equal(false);
    expect(fs.existsSync(path.join(root, 'plugins', 'upsun', 'index.js'))).to.equal(true);
    expect(fs.readFileSync(credentials, 'utf8')).to.equal('saved-token-cache');
    expect(clearTaskCaches.calledOnce).to.equal(true);
  });
});
