'use strict';

const fs = require('fs-extra');
const path = require('path');
const remove = require('./remove');


/*
 * brief wrapper to accomodate lando 3 conventions when using lando 4 plugin fetching
 */
module.exports = async (spec, opts, Plugin = require('../components/plugin')) => {
  // attempt to fetch the plugin
  const plugin = await Plugin.fetch(spec, opts);

  // lando 3 plugin loading is at odds with lando 4 plugin installing so we need to move up a directory
  // if the plugin has non-lando org scope also clean up dangling org dir
  if (plugin.scope && plugin.scope !== '@lando') {
    const src = plugin.location;
    const dest = path.resolve(plugin.location, '..', '..', plugin.name.split('/')[1]);
    const orgDir = path.resolve(plugin.location, '..', '..', plugin.name.split('/')[0]);

    // move and log
    fs.moveSync(src, dest, {overwrite: true});
    plugin.debug('non-lando org scoped plugin detected, moved up a dir to %s', dest);
    // remove and log
    remove(path.resolve(src, '..'));
    plugin.debug('removed dangling and presumably/hopefully empty org scope dir %s', orgDir);

    // get the plugin info again to confirm we moved it to the correct place
    // @NOTE: we use new Plugin() here instead of Plugin.info to ensure plugin remains consistent
    return new Plugin(dest);
  }

  // otherwise return the original
  return plugin;
};
