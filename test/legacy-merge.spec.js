/**
 * Tests for config system.
 * @file config.spec.js
 */

'use strict';

const _ = require('lodash');
const chai = require('chai');
const expect = chai.expect;
const hasher = require('object-hash');
chai.should();

const merge = require('../utils/legacy-merge');

describe('merge', () => {
  it('should return the same as _.merge for objects', () => {
    const bands1 = {
      best: 'nickelback',
      worst: 'beck',
    };
    const bands2 = {
      best: 'nickelback',
      worst: 'miley',
      supreme: 'taylor',
    };
    const landoMerge = hasher(merge(bands1, bands2));
    const lodashMerge = hasher(_.merge(bands1, bands2));
    expect(landoMerge).to.equal(lodashMerge);
  });

  it('should concatenates keys that are arrays', () => {
    const theworst = {favs: ['nickelback', 'abba']};
    const thebest = {favs: ['britney']};
    const bands = merge(theworst, thebest);
    expect(bands.favs).to.have.length(3);
    expect(hasher(bands.favs)).to.equal(hasher(['nickelback', 'abba', 'britney']));
  });

  it('should removes duplicates from cacatenated arrays', () => {
    const myfavs = {favs: ['nickelback', 'abba']};
    const yourfavs = {favs: ['britney', 'nickelback']};
    const ourfavs = merge(myfavs, yourfavs);
    expect(ourfavs.favs).to.have.length(3);
    expect(hasher(ourfavs.favs)).to.equal(hasher(['nickelback', 'abba', 'britney']));
  });
});
