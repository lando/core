'use strict';

/**
 * Warning message recommending an update for a containerd backend component.
 *
 * @param {Object} [opts={}] - Component version info.
 * @param {string} [opts.name] - Component name (e.g. "containerd", "buildkitd").
 * @param {string} [opts.version] - Currently installed version.
 * @param {string} [opts.update] - Recommended version to update to.
 * @param {string} [opts.link] - URL for release / update instructions.
 * @returns {{type: string, title: string, detail: string[], command: string, url: string}}
 */
module.exports = ({name, version, update, link} = {}) => ({
  type: 'warning',
  title: `Recommend updating ${name || 'containerd component'}`,
  detail: [
    `You have version ${version || 'unknown'} but we recommend updating to ${update || 'the latest version'}.`,
    'In order to ensure the best stability and support we recommend you update',
    'by running the hidden "lando setup" command.',
  ],
  command: 'lando setup --skip-common-plugins',
  url: link,
});
