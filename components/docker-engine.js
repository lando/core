/* eslint-disable max-len */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const merge = require('lodash/merge');
const slugify = require('slugify');
const stringArgv = require('string-argv').default;

const Dockerode = require('dockerode');
const {EventEmitter} = require('events');
const {nanoid} = require('nanoid');
const {PassThrough} = require('stream');

const makeError = require('../utils/make-error');
const makeSuccess = require('../utils/make-success');
const mergePromise = require('../utils/merge-promise');

class DockerEngine extends Dockerode {
  static name = 'docker-engine';
  static cspace = 'docker-engine';
  static config = {};
  static debug = require('debug')('docker-engine');
  static builder = require('../utils/get-docker-x')();
  static orchestrator = require('../utils/get-compose-x')();
  // @NOTE: is wsl accurate here?
  // static supportedPlatforms = ['linux', 'wsl'];

  constructor(config, {
    builder = DockerEngine.buildx,
    debug = DockerEngine.debug,
    orchestrator = DockerEngine.orchestrator,
  } = {}) {
    super(config);
    this.builder = builder;
    this.debug = debug;
    this.orchestrator = orchestrator;
  }

  /*
   * this is the legacy rest API image builder eg NOT buildx
   * this is a wrapper around Dockerode.build that provides either an await or return implementation.
   *
   * @param {*} command
   * @param {*} param1
   */
  build(dockerfile,
    {
      tag,
      attach = false,
      context = path.join(require('os').tmpdir(), nanoid()),
      id = tag,
      sources = [],
    } = {}) {
    // handles the promisification of the merged return
    const awaitHandler = async () => {
      return new Promise((resolve, reject) => {
        // if we are not attaching then lets log the progress to the debugger
        if (!attach) {
          builder.on('progress', data => {
            // handle pully messages
            if (data.id && data.status) {
              if (data.progress) debug('%s %o', data.status, data.progress);
              else debug('%s', data.status);
            }

            // handle buildy messages
            if (data.stream) debug('%s', data.stream);
          });
        }

        // handle resolve/reject
        builder.on('done', output => {
          resolve(makeSuccess(merge({}, args, {stdout: output[output.length - 1].status})));
        });
        builder.on('error', error => {
          reject(makeError(merge({}, args, {error})));
        });
      });
    };

    // handles the callback to super.pull
    // @TODO: event to pass through stream?
    const callbackHandler = (error, stream) => {
      // this ensures we have a consistent way of returning errors
      if (error) builder.emit('error', error);

      // if attach is on then lets stream output
      if (stream && attach) stream.pipe(process.stdout);

      // finished event
      const finished = (err, output) => {
        // if an error then fire error event
        if (err) builder.emit('error', err, output);
        // fire done no matter what?
        builder.emit('done', output);
        builder.emit('finished', output);
        builder.emit('success', output);
      };

      // progress event
      const progress = event => {
        builder.emit('data', event);
        builder.emit('progress', event);
      };

      // eventify the stream
      if (stream) this.modem.followProgress(stream, finished, progress);
    };

    // error if no dockerfile
    if (!dockerfile) throw new Error('you must pass a dockerfile into engine.build');
    // error if no dockerfile exits
    if (!fs.existsSync(dockerfile)) throw new Error(`${dockerfile} does not exist`);

    // extend debugger in appropriate way
    const debug = id ? this.debug.extend(id) : this.debug.extend('docker-engine:build');
    // collect some args we can merge into promise resolution
    // @TODO: obscure auth?
    const args = {command: 'dockerode buildImage', args: {dockerfile, tag, sources}};
    // create an event emitter we can pass into the promisifier
    const builder = new EventEmitter();

    // ensure context dir exists
    fs.mkdirSync(context, {recursive: true});

    // move other sources into the build context
    for (const source of sources) {
      fs.copySync(source.source, path.join(context, source.destination));
      debug('copied %o into build context %o', source.source, path.join(context, source.destination));
    }

    // copy the dockerfile to the correct place
    // @NOTE: we do this last to ensure we overwrite any dockerfile that may happenstance end up in the build-context
    // from source above
    fs.copySync(dockerfile, path.join(context, 'Dockerfile'));
    debug('copied Imagefile from %o to %o', dockerfile, path.join(context, 'Dockerfile'));

    // call the parent
    // @TODO: consider other opts? https://docs.docker.com/engine/api/v1.43/#tag/Image/operation/ImageBuild args?
    debug('building image %o from %o', tag, context);
    super.buildImage({context, src: fs.readdirSync(context)}, {forcerm: true, t: tag}, callbackHandler);

    // make this a hybrid async func and return
    return mergePromise(builder, awaitHandler);
  }

  /*
   * this is the buildx image builder
   *
   * unfortunately dockerode does not have an endpoint for this
   * see: https://github.com/apocas/dockerode/issues/601
   *
   * so we are invoking the cli directly
   *
   * @param {*} command
   * @param {*} param1
   */
  buildx(dockerfile,
    {
      tag,
      context = path.join(require('os').tmpdir(), nanoid()),
      id = tag,
      ignoreReturnCode = false,
      sources = [],
      stderr = '',
      stdout = '',
    } = {}) {
    // handles the promisification of the merged return
    const awaitHandler = async () => {
      return new Promise((resolve, reject) => {
        // handle resolve/reject
        buildxer.on('done', ({code, stdout, stderr}) => {
          debug('command %o done with code %o', args, code);
          resolve(makeSuccess(merge({}, args, code, stdout, stderr)));
        });
        buildxer.on('error', error => {
          debug('command %o error %o', args, error?.message);
          reject(error);
        });
      });
    };

    // error if no dockerfile
    if (!dockerfile) throw new Error('you must pass a dockerfile into buildx');
    // error if no dockerfile exits
    if (!fs.existsSync(dockerfile)) throw new Error(`${dockerfile} does not exist`);

    // extend debugger in appropriate way
    const debug = id ? this.debug.extend(id) : this.debug.extend('docker-engine:buildx');
    // build initial buildx command
    const args = {
      command: this.builder,
      args: [
        'buildx',
        'build',
        `--file=${dockerfile}`,
        '--progress=plain',
        `--tag=${tag}`,
        context,
      ],
    };

    // @TODO: add in other args like
    // `--ssh=default=${process.env.SSH_AUTH_SOCK}`,
    // `--ssh=default=/Users/pirog/.ssh/id_nopw`,
    // gha?
    // build args?
    // @TODO: consider other opts? https://docs.docker.com/reference/cli/docker/buildx/build/ args?

    // get builder
    const buildxer = require('../utils/run-command')(args.command, args.args, {debug});

    // augment buildxer with more events so it has the same interface as build
    buildxer.stdout.on('data', data => {
      buildxer.emit('data', data);
      buildxer.emit('progress', data);
      for (const line of data.toString().trim().split('\n')) debug(line);
      stdout += data;
    });
    buildxer.stderr.on('data', data => {
      buildxer.emit('data', data);
      buildxer.emit('progress', data);
      for (const line of data.toString().trim().split('\n')) debug(line);
      stderr += data;
    });
    buildxer.on('close', code => {
      // if code is non-zero and we arent ignoring then reject here
      if (code !== 0 && !ignoreReturnCode) {
        buildxer.emit('error', require('../utils/get-buildx-error')({code, stdout, stderr}));
      // otherwise return done
      } else {
        buildxer.emit('done', {code, stdout, stderr});
        buildxer.emit('finished', {code, stdout, stderr});
        buildxer.emit('success', {code, stdout, stderr});
      }
    });

    // ensure context dir exists
    fs.mkdirSync(context, {recursive: true});

    // move other sources into the build context
    for (const source of sources) {
      fs.copySync(source.source, path.join(context, source.destination));
      debug('copied %o into build context %o', source.source, path.join(context, source.destination));
    }

    // copy the dockerfile to the correct place
    fs.copySync(dockerfile, path.join(context, 'Dockerfile'));
    debug('copied Imagefile from %o to %o', dockerfile, path.join(context, 'Dockerfile'));

    // debug
    debug('buildxing image %o from %o', tag, context);

    // return merger
    return mergePromise(buildxer, awaitHandler);
  }

  /*
   * A helper method that automatically will build the image needed for the run command
   * NOTE: this is only available as async/await so you cannot return directly and access events
   *
   * @param {*} command
   * @param {*} param1
   */
  async buildNRun(dockerfile, command, {sources, tag, context, createOptions = {}, attach = false} = {}) {
    // if we dont have a tag we need to set something
    if (!tag) tag = slugify(nanoid()).toLowerCase();
    // build the image
    await this.build(dockerfile, {attach, context, sources, tag});
    // run the command
    await this.run(command, {attach, createOptions, tag});
  }

  /*
   * Add async info to the engine.
   *
   * @param {*} options
   * @returns
   */
  async init() {
    // const engine = new DockerEngine(options);
    // engine.info = await super.info();
    // return engine;
  }

  /*
   * This is intended for pulling images
   * This is a wrapper around Dockerode.pull that provides either an await or return implementation eg:
   *
   * @param {*} command
   * @param {*} param1
   */
  pull(image,
    {
      auth,
      attach = false,
    } = {}) {
    // handles the promisification of the merged return
    const awaitHandler = async () => {
      return new Promise((resolve, reject) => {
        // if we are not attaching then lets log the progress to the debugger
        if (!attach) {
          puller.on('progress', progress => {
            // extend debugger in appropriate way
            const debug = progress.id ? this.debug.extend(`pull:${image}:${progress.id}`) : this.debug.extend(`pull:${image}`);
            // only debug progress if we can
            if (progress.progress) debug('%s %o', progress.status, progress.progress);
            // otherwise just debug status
            else debug('%s', progress.status);
          });
        }

        // handle resolve/reject
        puller.on('done', output => {
          resolve(makeSuccess(merge({}, args, {stdout: output[output.length - 1].status})));
        });
        puller.on('error', error => {
          reject(makeError(merge({}, args, {error})));
        });
      });
    };

    // handles the callback to super.pull
    const callbackHandler = async (error, stream) => {
      // this ensures we have a consistent way of returning errors
      if (error) puller.emit('error', error);

      // if attach is on then lets stream output
      if (stream && attach) stream.pipe(process.stdout);

      // finished event
      const finished = (err, output) => {
        // if an error then fire error event
        if (err) puller.emit('error', err, output);
        // fire done no matter what?
        puller.emit('done', output);
        puller.emit('finished', output);
        puller.emit('success', output);
      };

      // progress event
      const progress = event => {
        puller.emit('data', event);
        puller.emit('progress', event);
      };

      // eventify the stream if we can
      if (stream) this.modem.followProgress(stream, finished, progress);
    };

    // error if no command
    if (!image) throw new Error('you must pass an image (repo/image:tag) into engine.pull');

    // collect some args we can merge into promise resolution
    const args = {command: 'dockerode pull', args: {image, auth, attach}};
    // create an event emitter we can pass into the promisifier
    const puller = new EventEmitter();
    // call the parent with clever stuff
    super.pull(image, {authconfig: auth}, callbackHandler);
    // log
    this.debug('pulling image %o', image);
    // make this a hybrid async func and return
    return mergePromise(puller, awaitHandler);
  }

  /*
   * A helper method that automatically will pull the image needed for the run command
   * NOTE: this is only available as async/await so you cannot return directly and access events
   *
   * @param {*} command
   * @param {*} param1
   */
  async pullNRun(image, command, {auth, attach = false, createOptions = {}} = {}) {
    // pull the image
    await this.pull(image, {attach, authconfig: auth});
    // run the command
    await this.run(command, {attach, createOptions, image});
  }

  /*
   * This is intended for ephermeral none-interactive "one off" commands. Use `exec` if you want to run a command on a
   * pre-existing container.
   *
   * This is a wrapper around Dockerode.run that provides either an await or return implementation eg:
   *
   * @param {*} command
   * @param {*} param1
   */
  run(command,
    {
      image = 'node:18-alpine',
      createOptions = {},
      allo = '',
      attach = false,
      interactive = false,
      stream = null,
      stdouto = '',
      stderro = '',
    } = {}) {
    const awaitHandler = async () => {
      return new Promise((resolve, reject) => {
        runner.on('container', container => {
          runner.on('stream', stream => {
            const stdout = new PassThrough();
            const stderr = new PassThrough();

            // handle attach dynamics
            if (attach) {
              // if tty and just pipe everthing to stdout
              if (copts.Tty) stream.pipe(process.stdout);
              // otherwise we should be able to pipe both
              else {
                stdout.pipe(process.stdout);
                stderr.pipe(process.stderr);
              }
            }

            // handle tty case
            if (copts.Tty) stream.on('data', buffer => runner.emit('stdout', buffer));
            // handle demultiplexing
            else {
              stdout.on('data', buffer => runner.emit('stdout', buffer));
              stderr.on('data', buffer => runner.emit('stderr', buffer));
              container.modem.demuxStream(stream, stdout, stderr);
            }

            // make sure we close child streams when the parent is done
            stream.on('end', () => {
              try {
                stdout.end();
              } catch {}

              try {
                stderr.end();
              } catch {}
            });
          });

          // if we get here we should have access to the container object so we should be able to collect output?
          // extend the debugger
          const debug = this.debug.extend(`run:${image}:${container.id.slice(0, 4)}`);
          // collect and debug stdout
          runner.on('stdout', buffer => {
            stdouto += String(buffer);
            allo += String(buffer);
            if (!attach) debug.extend('stdout')(String(buffer));
          });
          // collect and debug stderr
          runner.on('stderr', buffer => {
            stderro += String(buffer);
            allo += String(buffer);
            if (!attach) debug.extend('stderr')(String(buffer));
          });

          runner.on('data', data => {
            // emit error first
            if (data.StatusCode !== 0) runner.emit('error', data);
            // fire done no matter what?
            runner.emit('done', data);
            runner.emit('finished', data);
            runner.emit('success', data);
          });
        });

        // handle resolve/reject
        runner.on('done', data => {
          // @TODO: what about data?
          resolve(makeSuccess(merge({}, data, {command: 'dockerode run', all: allo, stdout: stdouto, stderr: stderro}, {args: command})));
        });
        runner.on('error', error => {
          reject(makeError(merge({}, args, {command: 'dockerode run', all: allo, stdout: stdouto, stderr: stderro}, {args: command}, {error})));
        });
      });
    };

    // handles the callback to super.run
    // we basically need this just to handle dockerode modem errors
    const callbackHandler = error => {
      if (error) runner.emit('error', error);
    };

    // error if no command
    if (!command) throw new Error('you must pass a command into engine.run');
    // arrayify commands that are strings
    if (typeof command === 'string') command = stringArgv(command);

    // some good default createOpts
    const defaultCreateOptions = {
      AttachStdin: interactive,
      HostConfig: {AutoRemove: true},
      Tty: false || interactive || attach,
      OpenStdin: true,
    };
    // merge our create options over the defaults
    const copts = merge({}, defaultCreateOptions, createOptions);
    // collect some args we can merge into promise resolution
    const args = {args: {command, image, copts, attach, stream}};
    // call the parent with clever stuff
    const runner = super.run(image, command, stream, copts, {}, callbackHandler);
    // log
    this.debug('running command %o on image %o with create opts %o', command, image, copts);
    // make this a hybrid async func and return
    return mergePromise(runner, awaitHandler);
  }
}

module.exports = DockerEngine;
