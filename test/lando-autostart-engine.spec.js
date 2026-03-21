'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const autostartEngine = require('./../hooks/lando-autostart-engine');

describe('lando-autostart-engine', () => {
  it('should skip Docker autostart logic for containerd backends', async () => {
    const isUp = sinon.stub().resolves(false);
    const runTasks = sinon.stub().resolves();
    const lando = {
      _bootstrapLevel: 3,
      config: {engine: 'containerd'},
      engine: {
        engineBackend: 'containerd',
        daemon: {isUp},
      },
      log: {debug: () => {}},
      runTasks,
      shell: {sh: sinon.stub().resolves()},
    };

    await autostartEngine(lando);

    expect(isUp.called).to.equal(false);
    expect(runTasks.called).to.equal(false);
  });
});
