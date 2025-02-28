'use strict';

const LandoRenderer = require('./lando');

const {EOL} = require('os');
const {color, ListrTaskEventType} = require('listr2');

const getDefaultColor = state => {
  switch (state) {
    case 'STARTED':
    case 'COMPLETED':
    case 'RETRY':
      return 'green';
    case 'FAILED':
      return 'red';
    case 'WAITING':
      return 'yellow';
    default:
      return 'dim';
  }
};

class DC2Renderer extends LandoRenderer {
  constructor(tasks, options, $renderHook) {
    // force dc2 indentation
    options.level = 0.5;

    // dc2 header stuff
    options.header = options.header || 'Processing';
    options.icon = {...options.icon, DOCKER_COMPOSE_HEADER: '[+]'};
    options.taskCount = options.taskCount || 0;
    options.showErrorMessage = false;
    options.spacer = options.spacer ?? 3;

    // dc2 state changes
    options.states = {
      COMPLETED: {message: 'Done', color: 'green'},
      FAILED: {message: 'ERROR', color: 'red'},
      SKIPPED: {message: 'Deferred', color: 'gray'},
      STARTED: {message: 'Waiting', color: 'green'},
      WAITING: {message: 'Waiting', color: 'gray'},
      ...options.states,
    };

    // normalize state data
    for (const [state, data] of Object.entries(options.states)) {
      if (typeof data === 'string') options.states[state] = {message: data, color: getDefaultColor(state)};
    }

    // super
    super(tasks, options, $renderHook);


    // normalize error data to handle multiline and atttempt generic error discovery
    for (const task of this.tasks) {
      task.on(ListrTaskEventType.MESSAGE, message => {
        if (message?.error && typeof message.error === 'string') {
          if (message.error.split('\n').length > 1) {
            const lines = message.error.split('\n').filter(line => line !== '');
            const errors = lines.filter(line => {
              return line.toUpperCase().startsWith('ERROR:') || line.toUpperCase().startsWith('E:');
            });
            message.error = errors.length > 0 ? errors[errors.length - 1] : lines[lines.length - 1];
          }

          task.message.error = message.error.trim();
        }
      });
    }
  }

  create(options) {
    options = {
      tasks: true,
      bottomBar: true,
      prompt: true,
      ...options,
    };

    const render = [];

    const renderTasks = this.renderer(this.tasks, this.options.level);
    const renderBottomBar = this.renderBottomBar();
    const renderPrompt = this.renderPrompt();
    const renderHeader = this.renderHeader(this.options.header, this.options.taskCount);

    if (options.tasks && renderHeader && renderTasks.length > 0) render.push(...renderHeader);

    if (options.tasks && renderTasks.length > 0) render.push(...renderTasks);

    if (options.bottomBar && renderBottomBar.length > 0) {
      if (render.length > 0) render.push('');
      render.push(...renderBottomBar);
    }

    if (options.prompt && renderPrompt.length > 0) {
      if (render.length > 0) render.push('');
      render.push(...renderPrompt);
    }

    return render.join(EOL);
  }

  getMax(tasks = []) {
    if (tasks.length === 0) return 0;

    const lengths = tasks
      .flatMap(task => task)
      .filter(task => task.hasTitle() && typeof task.initialTitle === 'string')
      .flatMap(task => ([
        task.initialTitle,
        task?.title,
        task?.message?.error,
      ]))
      .filter(data => typeof data === 'string')
      .map(data => data.length);

    return Math.max(...lengths);
  }

  getSpacer(data = '', max = 0) {
    data = require('strip-ansi')(data);
    if (!max || max === 0 || !Number.isInteger(max)) return '  ';
    return require('lodash/range')(max - data.trim().length + this.options.spacer).map(() => '').join(' ');
  }

  renderer(tasks, level) {
    // get output
    const output = super.renderer(tasks, level);

    // hack output to emulate DC style stuff
    output.flatMap((line, index) => {
      const task = tasks.filter(task => task.enabled)[index];
      const vibe = this.options.states[task.state] ?? this.options.states['STARTED'];

      task.spacer = this.getSpacer(task?.message?.error ?? task.title ?? task.initialTitle, this.getMax(tasks));
      task.status = color[vibe.color](vibe.message);

      output[index] = `${line}${task.spacer}${task.status}`;
    });

    return output;
  }

  renderHeader(header, count) {
    if (header && count > 0) {
      return [color.blue(this.format(
        `${header} ${count}/${count}`,
        this.logger.options.icon.DOCKER_COMPOSE_HEADER,
      ))];
    }

    return [];
  }
}

module.exports = DC2Renderer;

