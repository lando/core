/**
 * Tests for describe-context.js
 * @file describe-context.spec.js
 */

'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const describeContext = require('../utils/describe-context');

describe('describe-context', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;
  const originalStderrIsTTY = process.stderr.isTTY;
  const originalLando = process.lando;
  const originalEnv = {...process.env};

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    process.stdout.isTTY = originalStdoutIsTTY;
    process.stderr.isTTY = originalStderrIsTTY;
    process.lando = originalLando;
    // Restore env vars we may have changed
    delete process.env.CI;
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    if (originalEnv.CI !== undefined) process.env.CI = originalEnv.CI;
    if (originalEnv.NO_COLOR !== undefined) process.env.NO_COLOR = originalEnv.NO_COLOR;
    if (originalEnv.FORCE_COLOR !== undefined) process.env.FORCE_COLOR = originalEnv.FORCE_COLOR;
  });

  it('should return an object with stdin, stdout, stderr, env, and flags', () => {
    const ctx = describeContext();
    expect(ctx).to.have.property('stdin');
    expect(ctx).to.have.property('stdout');
    expect(ctx).to.have.property('stderr');
    expect(ctx).to.have.property('env');
    expect(ctx).to.have.property('isNodeMode');
    expect(ctx).to.have.property('ci');
    expect(ctx).to.have.property('noColor');
    expect(ctx).to.have.property('forceColor');
  });

  it('should expose process.env as env', () => {
    const ctx = describeContext();
    expect(ctx.env).to.equal(process.env);
  });

  it('should reflect stdin TTY state', () => {
    process.stdin.isTTY = true;
    expect(describeContext().stdin.isTTY).to.be.true;

    process.stdin.isTTY = undefined;
    expect(describeContext().stdin.isTTY).to.be.false;
  });

  it('should reflect stdout TTY state', () => {
    process.stdout.isTTY = true;
    expect(describeContext().stdout.isTTY).to.be.true;

    process.stdout.isTTY = undefined;
    expect(describeContext().stdout.isTTY).to.be.false;
  });

  it('should reflect stderr TTY state', () => {
    process.stderr.isTTY = true;
    expect(describeContext().stderr.isTTY).to.be.true;

    process.stderr.isTTY = undefined;
    expect(describeContext().stderr.isTTY).to.be.false;
  });

  it('should default stdout columns and rows when not available', () => {
    const ctx = describeContext();
    expect(ctx.stdout.columns).to.be.a('number');
    expect(ctx.stdout.rows).to.be.a('number');
    // Should have sensible defaults
    expect(ctx.stdout.columns).to.be.at.least(1);
    expect(ctx.stdout.rows).to.be.at.least(1);
  });

  it('should detect node mode from process.lando', () => {
    process.lando = 'node';
    expect(describeContext().isNodeMode).to.be.true;

    process.lando = 'browser';
    expect(describeContext().isNodeMode).to.be.false;

    delete process.lando;
    expect(describeContext().isNodeMode).to.be.false;
  });

  it('should detect CI from environment', () => {
    process.env.CI = 'true';
    expect(describeContext().ci).to.be.true;

    delete process.env.CI;
    expect(describeContext().ci).to.be.false;
  });

  it('should detect NO_COLOR from environment', () => {
    process.env.NO_COLOR = '1';
    expect(describeContext().noColor).to.be.true;

    delete process.env.NO_COLOR;
    expect(describeContext().noColor).to.be.false;
  });

  it('should detect NO_COLOR when set to an empty string', () => {
    process.env.NO_COLOR = '';
    expect(describeContext().noColor).to.be.true;

    delete process.env.NO_COLOR;
    expect(describeContext().noColor).to.be.false;
  });

  it('should capture FORCE_COLOR from environment', () => {
    process.env.FORCE_COLOR = '3';
    expect(describeContext().forceColor).to.equal('3');

    delete process.env.FORCE_COLOR;
    expect(describeContext().forceColor).to.be.undefined;
  });
});
