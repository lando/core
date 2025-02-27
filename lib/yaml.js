'use strict';

// Modules
const fs = require('fs');
const path = require('path');
const yaml = require('../components/yaml');

const Log = require('./logger');

/*
 * Creates a new yaml instance.
 */
module.exports = class Yaml {
  constructor(log = new Log()) {
    this.log = log;
  }

  /**
   * Loads a yaml object from a file.
   *
   * @since 3.0.0
   * @alias lando.yaml.load
   * @param {String} file The path to the file to be loaded
   * @return {Object} The loaded object
   * @example
   * // Add a string to the cache
   * const thing = lando.yaml.load('/tmp/myfile.yml');
   */
  load(file) {
    try {
      return yaml.load(fs.readFileSync(file));
    } catch (e) {
      this.log.error('Problem parsing %s with %s', file, e.message);
    }
  }

  /**
   * Dumps an object to a YAML file
   *
   * @since 3.0.0
   * @alias lando.yaml.dump
   * @param {String} file The path to the file to be loaded
   * @param {Object} data The object to dump
   * @return {String} Flename
   */
  dump(file, data = {}) {
    // Make sure we have a place to store these files
    fs.mkdirSync(path.dirname(file), {recursive: true});
    // Remove any properties that might be bad and dump
    data = JSON.parse(JSON.stringify(data));
    // And dump
    fs.writeFileSync(file, yaml.dump(data));
    // Log and return filename
    return file;
  }
};
