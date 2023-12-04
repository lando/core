'use strict';

const LandoRenderer = require('./lando');

const {EOL} = require('os');
const {color} = require('listr2');

class DC2Renderer extends LandoRenderer {
  constructor(tasks, options, $renderHook) {
    // force dc2 indentation
    options.level = 0.5;

    // dc2 header stuff
    options.header = options.header || 'Processing';
    options.icon = {...options.icon, DOCKER_COMPOSE_HEADER: '[+]'};
    options.taskCount = options.taskCount || 0;
    options.showErrorMessage = false;

    // dc2 state changes
    options.states = {
      COMPLETED: {message: 'Done', color: 'green'},
      FAILED: {message: 'ERROR', color: 'red'},
      STARTED: {message: 'Waiting', color: 'green'},
      ...options.states,
    };

    // normalize state data
    for (const [state, data] of Object.entries(options.states)) {
      if (typeof data === 'string') options.states[state] = {message: data, color: 'green'};
    }

    // super
    super(tasks, options, $renderHook);
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

  getSpacer(size, max) {
    if (!max || max === 0 || !Number.isInteger(max)) return '  ';
    return require('lodash/range')(max - size + 3).map(s => '').join(' ');
  }

  renderer(tasks, level, max) {
    // figure out the max if there is one
    if (Array.isArray(tasks) && tasks.length > 1) {
      const lengths = tasks
        .flatMap(task => task)
        .filter(task => task.hasTitle() && typeof task.initialTitle === 'string')
        .map(task => task.initialTitle.length);
      max = Math.max(...lengths);
    }

    // loop through tasks and add our listener stuff
    tasks.flatMap(task => {
      if (task.hasTitle() && typeof task.initialTitle === 'string') {
        // get the spacer
        task.spacer = this.getSpacer(task.initialTitle.length, max);
        // update title based on state change
        for (const [state, data] of Object.entries(this.options.states)) {
          if (task.state === state) {
            task.title = `${task.initialTitle}${task.spacer}${color[data.color](data.message)}`;
          }
        }
      }
    });

    // pass up
    return super.renderer(tasks, level);
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

