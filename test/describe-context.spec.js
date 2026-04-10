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
  const originalLando = process.lando;

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    process.stdout.isTTY = originalStdoutIsTTY;
    process.lando = originalLando;
  });

  it('should return an object with stdin, stdout, isNodeMode, and env', () => {
    const ctx = describeContext();
    expect(ctx).to.have.property('stdin');
    expect(ctx).to.have.property('stdout');
    expect(ctx).to.have.property('isNodeMode');
    expect(ctx).to.have.property('env');
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
});
