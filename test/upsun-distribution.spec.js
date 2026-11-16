/**
 * Tests for default Upsun distribution across setup and bundled builds.
 * @file upsun-distribution.spec.js
 */

'use strict';

const {expect} = require('chai');
const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const getDefaults = require('../utils/get-config-defaults');
const setupCommonPlugins = require('../hooks/lando-setup-common-plugins');

describe('Upsun distribution', () => {
  for (const channel of ['stable', 'edge']) {
    it(`includes Upsun in ${channel} setup without reinstalling the legacy package`, async () => {
      const lando = {config: {...getDefaults(), channel}, log: {debug: () => {}}};
      const options = {plugins: {}};
      await setupCommonPlugins(lando, options);
      expect(options.plugins['@lando/upsun']).to.equal(channel === 'edge' ? 'edge' : 'latest');
      expect(options.plugins).not.to.have.property('@lando/platformsh');
    });
  }

  it('preserves explicit setup selectors', async () => {
    const lando = {config: getDefaults(), log: {debug: () => {}}};
    const options = {plugins: {'@lando/upsun': '1.0.0-alpha.0'}};
    await setupCommonPlugins(lando, options);
    expect(options.plugins['@lando/upsun']).to.equal('1.0.0-alpha.0');
  });

  it('does not install Upsun when common plugins are skipped', async () => {
    const lando = {config: getDefaults()};
    const options = {plugins: {}, skipCommonPlugins: true};
    await setupCommonPlugins(lando, options);
    expect(options.plugins).to.deep.equal({});
  });

  // Windows packaging runs this Bash script in CI; these stubs do not invoke host setup.
  const describeBash = process.platform === 'win32' ? describe.skip : describe;
  describeBash('bundled installer', () => {
    let root;
    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-upsun-distribution-'));
      fs.writeFileSync(path.join(root, 'lando'), '#!/bin/bash\nprintf "%s\\n" "$@" > "$UPSUN_PLUGIN_ARGS_FILE"\n',
        {mode: 0o755});
      fs.writeFileSync(path.join(root, 'config.yml'), 'channel: stable\n');
    });
    afterEach(() => fs.rmSync(root, {recursive: true, force: true}));

    for (const channel of ['stable', 'edge']) {
      it(`includes all default plugins in the ${channel} bundle`, () => {
        const env = {...process.env, UPSUN_PLUGIN_ARGS_FILE: path.join(root, 'args')};
        for (const key of ['BASH_ENV', 'ENV', 'SHELLOPTS', 'BASHOPTS']) delete env[key];
        execFileSync('bash', [path.resolve(__dirname, '../scripts/install-plugins.sh'),
          '--lando', path.join(root, 'lando'), ...(channel === 'edge' ? ['--edge'] : [])],
        {cwd: root, env, timeout: 5000});
        const args = fs.readFileSync(path.join(root, 'args'), 'utf8').trim().split('\n');
        const tag = channel === 'edge' ? 'edge' : 'latest';
        expect(args[0]).to.equal('plugin-add');
        expect(args).to.include(`@lando/upsun@${tag}`);
        expect(args.some(arg => arg.startsWith('@lando/platformsh@'))).to.equal(false);
        for (const plugin of Object.keys(getDefaults().setup.commonPlugins)) {
          expect(args).to.include(`${plugin}@${plugin === '@lando/compose' ? 'latest' : tag}`);
        }
        expect(fs.existsSync(path.join(root, 'FATCORE'))).to.equal(true);
      });
    }
  });
});
