
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// @TODO: poc @type?
// @TODO: autodetect type?

// @TODO: move into lando and update yaml things to v4

// @TODO: integrate and rebase using read?
// @TODO: add in fileloader mapping?

// helper to extract type tag
const parseFileTypeInput = input => {
  const parts = input.split('@');
  return {
    type: parts?.[1] ?? 'string',
    file: parts[0].trim(),
  };
};

// file loader options
const fileloader = {
  kind: 'scalar',
  resolve: function(data) {
    // Kill immediately if we have to
    if (typeof data !== 'string') return false;

    // try to sus out type/path info from data
    const {file} = parseFileTypeInput(data);
    // if data is not an absolute path then resolve with base
    if (!path.isAbsolute(file)) data = path.resolve(this.base, file);
    // Otherwise check the path exists
    return fs.existsSync(data);
  },
  construct: function(data) {
    // transform data
    data = {raw: data, ...parseFileTypeInput(data)};
    //  normalize if needed
    data.file = !path.isAbsolute(data.file) ? path.resolve(this.base, data.file) : data.file;

    // switch based on type
    switch (data.type) {
      case 'binary':
        return new ImportString(fs.readFileSync(data.file, {encoding: 'base64'}), data);
      case 'json':
        return new ImportObject(require(data.file), data);
      case 'string':
        return new ImportString(fs.readFileSync(data.file, {encoding: 'utf8'}), data);
      case 'yaml':
      case 'yaml':
        return new ImportObject(yaml.load(data.file), data);
      default:
        return new ImportString(fs.readFileSync(data.file, {encoding: 'utf8'}), data);
    };
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
  ]);
};

// old ones
yaml._load = yaml.load;
yaml._dump = yaml.dump;

yaml.load = (file, options = {}) => {
  // @TODO: extra error handling?
  // determine the filebase
  const base = options.base ?? path.dirname(path.resolve(file));
  // @TODO: resolve with base if needed?
  // get contents
  const contents = fs.readFileSync(file, {encoding: 'utf8'});
  // pass to older func
  return yaml._load(contents, {schema: getLandoSchema(base), ...options});
};

yaml.dump = (data, options = {}) => {
  return yaml._dump(data, {schema: getLandoSchema(), quotingType: '"', ...options});
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

const loaded = yaml.load('./examples/test.yaml');
const dumped = yaml.dump(loaded);

console.log(loaded);
console.log(dumped);
