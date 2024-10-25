'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const remove = require('./remove');

const {EventEmitter} = require('events');
const {nanoid} = require('nanoid');

const axios = require('../utils/get-axios')({}, {}, {rejectUnauthorized: false});

// helper to get a platform spec tmpfile
const tmpfile = () => {
  return process.platform === 'win32' ? path.join(os.tmpdir(), `${nanoid()}.exe`) : path.join(os.tmpdir(), nanoid());
};

module.exports = (url, {
  debug = require('debug')('@lando/download-x'),
  dest = path.join(os.tmpdir(), nanoid()),
  test = false} = {},
) => {
  // create an event emitter we can return
  const download = new EventEmitter();
  // download progress event
  const onDownloadProgress = data => {
    data.percentage = Math.round(data.progress * 100);
    download.emit('progress', data);
    debug('downloading %o to %o... (%o%)', url, dest, data.percentage);
  };

  // get the stream and start writing
  axios({url, responseType: 'stream', onDownloadProgress}).then(response => new Promise((resolve, reject) => {
    // emit response and add the data stream to the event emitter
    download.emit('response', response);
    // set some props for later
    download.data = response.data;
    download.status = response.status;
    download.statusText = response.statusText;

    // get a temporary destination test file and writer
    download.testfile = tmpfile();
    const writer = fs.createWriteStream(download.testfile);
    // and write dat data
    response.data.pipe(writer);
    // resolve promise
    writer.on('error', error => reject(error));
    writer.on('close', () => resolve());
    // debug
    debug('downloading %o %o with code %o', url, response.statusText, response.status);
  }))

  // an error has occured
  .catch(error => {
    // if error has a status code then rewrite message
    if (error?.response?.status) {
      error.message = `could not download ${url} [${error.response.status}] ${error.response.statusText}`;
    }

    download.error = error;
    download.emit('error', download.error);
  })

  // trust but verify
  .finally(async () => {
    // if the file exists then try to finish up
    if (fs.existsSync(download.testfile)) {
      require('./make-executable')([path.basename(download.testfile)], path.dirname(download.testfile));
      // run the test if we have one
      download.test = test ? require('./spawn-sync-stringer')(download.testfile, test) : false;
      const {pid, status, stderr, stdout} = download.test;

      // if we have a test and it succeeded just let the people know
      if (download.test !== false && download.test.status === 0) {
        debug('%o download test %o passed with %o', url, test.join(' '), stdout);
      }

      // if we have a test and it failed then yet another error
      if (download.test !== false && download.test.status !== 0) {
        const error = new Error(`${url} download test ${test.join(' ')} failed with code ${status} and ${stderr}`);
        error.pid = pid;
        error.stdout = stdout;
        error.status = status;
        debug(error.message);
        download.emit('error', error);

      // otherwise we assume all is well and we emit success!
      } else {
        if (fs.existsSync(dest)) remove(dest);
        fs.mkdirSync(path.dirname(dest), {recursive: true});
        fs.copyFileSync(download.testfile, dest);
        debug('downloaded %o to %o', url, dest);
        const data = {dest, url, test: download.test, status: download.status, text: download.statusText};
        download.emit('success', data);
        download.emit('done', data);
      }
    }
  });

  // merge promise magix so we can await or not
  return require('./merge-promise')(download, async () => {
    return new Promise((resolve, reject) => {
      download.on('error', error => reject(error));
      download.on('success', success => resolve(success));
    });
  });
};
