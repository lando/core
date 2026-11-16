/**
 * Tests removal of plugins replaced by Upsun.
 * @file plugin-remove.spec.js
 */

'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
const {expect} = chai;
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
  });

  afterEach(() => {
    Plugin.debug = debug;
    console.log.restore();
    fs.rmSync(root, {recursive: true, force: true});
  });

  const addPlugin = (directory, name) => {
    const dir = path.join(root, directory);
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = () => ({});');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({name, version: '1.0.0'}));
    return dir;
  };

  const createLando = (pluginDirs = [{path: root, namespace: '@lando'}], local = []) => {
    const log = new Log({logLevelConsole: 'error'});
    const plugins = new Plugins(log);
    const active = plugins.find(pluginDirs, {plugins: local});
    return {
      log,
      plugins,
      config: {pluginDirs, plugins: active},
      cli: {clearTaskCaches: sinon.spy()},
      runTasks: async tasks => {
        const ctx = {errors: [], results: []};
        for (const task of tasks) {
          try {
            await task.task(ctx, {skip: sinon.spy()});
          } catch (error) {
            // The removal task records errors in ctx, as consumed by the real runner.
          }
        }
        return {...ctx, total: tasks.length};
      },
    };
  };

  const remove = (lando, name) => pluginRemove(lando).run({_: ['plugin-remove', name]});

  it('removes suppressed Platform.sh while preserving Upsun and saved credentials', async () => {
    const legacy = addPlugin('plugins/platformsh', '@lando/platformsh');
    const upsun = addPlugin('plugins/upsun', '@lando/upsun');
    const lando = createLando();
    expect(lando.config.plugins.map(plugin => plugin.name)).to.deep.equal(['@lando/upsun']);
    const credentials = path.join(root, 'platformsh.tokens');
    fs.writeFileSync(credentials, 'saved-token-cache');

    await remove(lando, '@lando/platformsh');

    expect(fs.existsSync(legacy)).to.equal(false);
    expect(fs.existsSync(path.join(upsun, 'index.js'))).to.equal(true);
    expect(fs.readFileSync(credentials, 'utf8')).to.equal('saved-token-cache');
    expect(lando.cli.clearTaskCaches.calledOnce).to.equal(true);
  });

  for (const legacyName of ['old-platformsh', 'platformsh']) {
    it(`removes the real legacy package despite an Upsun discovery-name collision (${legacyName})`, async () => {
      const legacy = addPlugin(`plugins/${legacyName}`, '@lando/platformsh');
      const upsun = addPlugin('development/platformsh', '@lando/upsun');
      const lando = createLando([
        {path: root, namespace: '@lando'},
        {path: root, subdir: 'development', namespace: '@lando'},
      ]);
      expect(lando.config.plugins.map(plugin => plugin.name)).to.deep.equal(['@lando/platformsh']);
      expect(lando.config.plugins[0].packageName).to.equal('@lando/upsun');

      await remove(lando, '@lando/platformsh');

      expect(fs.existsSync(legacy)).to.equal(false);
      expect(fs.existsSync(path.join(upsun, 'index.js'))).to.equal(true);
    });
  }

  it('does not delete a renamed Upsun checkout when the legacy package is absent', async () => {
    const upsun = addPlugin('plugins/platformsh', '@lando/upsun');
    const lando = createLando();

    await expect(remove(lando, '@lando/platformsh')).to.be.rejectedWith('There was a problem removing');

    expect(fs.existsSync(path.join(upsun, 'index.js'))).to.equal(true);
  });

  it('removes a renamed Upsun checkout by its canonical package name', async () => {
    const upsun = addPlugin('plugins/platformsh', '@lando/upsun');

    await remove(createLando(), '@lando/upsun');

    expect(fs.existsSync(upsun)).to.equal(false);
  });

  for (const alias of ['my-upsun', '@example/my-upsun']) {
    it(`preserves explicit local alias removal (${alias})`, async () => {
      const upsun = addPlugin('checkout', '@lando/upsun');
      const lando = createLando([], [{type: 'local', name: alias, path: upsun}]);

      await remove(lando, alias);

      expect(fs.existsSync(upsun)).to.equal(false);
    });
  }
});
