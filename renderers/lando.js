'use strict';

const {EOL} = require('os');
const {DefaultRenderer, ListrEventType} = require('listr2');

class LandoRenderer extends DefaultRenderer {
  constructor(tasks, options, $renderHook) {
    super(tasks, options, $renderHook);
    this.options.level = options.level ?? 0.5;
  }

  create(options) {
    options = {
      tasks: true,
      bottomBar: true,
      prompt: true,
      ...options,
    };

    options.prompt = true;

    const render = [];

    const renderTasks = this.renderer(this.tasks, this.options.level);
    const renderBottomBar = this.renderBottomBar();
    const renderPrompt = this.renderPrompt();

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

  async render() {
    const logUpdate = require('log-update');
    const truncate = require('cli-truncate');
    const wrap = require('wrap-ansi');

    this.updater = logUpdate.create(this.logger.process.stdout);
    this.truncate = truncate;
    this.wrap = wrap;
    this.logger.process.hijack();
    if (!this.options?.lazy) {
      this.spinner.start(() => {
        this.update();
      });
    }
    this.events.on(ListrEventType.SHOULD_REFRESH_RENDER, () => {
      this.update();
    });
  }
}

module.exports = LandoRenderer;

