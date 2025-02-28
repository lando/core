'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const validPath = require('valid-path');

// @TODO: add in fileloader mapping?
// @TODO: integrate and rebase using read?
// @TODO: debugger?

// helper to extract type tag
const parseFileTypeInput = input => {
  // find the parts
  const parts = input.split('@');
  const file = parts[0].trim();
  const type = parts?.[1] ?? path.extname(file);

  return {
    file,
    type: type.startsWith('.') ? type.slice(1) : type,
  };
};

// helper to find file
const findFile = (file, base = undefined) => {
  return require('../utils/traverse-up')([file], path.resolve(base))
    .map(candidate => path.join(path.dirname(candidate), file))
    .find(candidate => fs.existsSync(candidate));
};

// file loader options
const fileloader = {
  kind: 'scalar',
  resolve: function(data) {
    // Kill immediately if we have to
    if (typeof data !== 'string') return false;

    // try to sus out type/path info from data
    const input = parseFileTypeInput(data);

    // if data is not an absolute path then resolve with base
    if (!path.isAbsolute(input.file)) input.file = findFile(input.file, this.base);

    // Otherwise check the path exists
    return fs.existsSync(input.file);
  },
  construct: function(data) {
    // transform data
    data = {raw: data, ...parseFileTypeInput(data)};
    // normalize if needed
    data.file = !path.isAbsolute(data.file) ? findFile(data.file, this.base) : data.file;

    // switch based on type
    switch (data.type) {
      case 'binary':
        return new ImportString(fs.readFileSync(data.file, {encoding: 'base64'}), data);
      case 'json':
        return new ImportObject(JSON.parse(fs.readFileSync(data.file, {encoding: 'utf8'}), data));
      case 'string':
        return new ImportString(fs.readFileSync(data.file, {encoding: 'utf8'}), data);
      case 'yaml':
      case 'yml':
        return new ImportObject(yaml.load(data.file), data);
      default:
        return new ImportString(fs.readFileSync(data.file, {encoding: 'utf8'}), data);
    }
  },
  predicate: data => data instanceof ImportString || data instanceof ImportObject,
  represent: data => data.getDumper(),
};

// wrapper to accomodate a base url for files
class FileType extends yaml.Type {
  constructor(tag, options = {}) {
    // extract the base from options to pass super validation
    const base = options.base ?? process.cwd();
    delete options.base;

    // super
    super(tag, options);

    // readd base
    this.base = base;
  }
}

const getLandoSchema = (base = process.cwd()) => {
  return yaml.DEFAULT_SCHEMA.extend([
    new FileType('!import', {...fileloader, base}),
    new FileType('!load', {...fileloader, base}),
  ]);
};

class ImportString extends String {
  #metadata;

  constructor(value, metadata = {}) {
    super(value);
    this.#metadata = metadata;
  }

  getMetadata() {
    return this.#metadata;
  }

  getDumper() {
    return this.#metadata.raw;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === 'string') {
      return this.toString();
    }
    return this.toString();
  }
}

class ImportObject extends Object {
  #metadata;

  constructor(value = {}, metadata = {}) {
    super();
    Object.assign(this, value);
    this.#metadata = metadata;
  }

  getMetadata() {
    return this.#metadata;
  }

  getDumper() {
    return this.#metadata.raw;
  }
}

// old ones
yaml._load = yaml.load;
yaml._dump = yaml.dump;

yaml.load = (data, options = {}) => {
  // if data is buffer then just pass it through
  if (Buffer.isBuffer(data)) return yaml._load(data, {schema: getLandoSchema(options.base), ...options});
  // ditto for multiline strings
  else if (data.split('\n').length > 1) return yaml._load(data, {schema: getLandoSchema(options.base), ...options});

  // if we get here its either the path to a file or not
  // if data is actually a file then we do some extra stuff
  if (validPath(data) && fs.existsSync(data)) {
    options.base = options.base ?? path.dirname(path.resolve(data));
    data = fs.readFileSync(data, {encoding: 'utf8'});
  }

  // pass through
  return yaml._load(data, {schema: getLandoSchema(options.base), ...options});
};

yaml.dump = (data, options = {}) => {
  return yaml._dump(data, {schema: getLandoSchema(), quotingType: '"', ...options});
};


module.exports = yaml;
