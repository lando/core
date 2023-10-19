'use strict';

const LandoDebugRenderer = require('./debug');

const {color} = require('listr2');

class DC2DebugRenderer extends LandoDebugRenderer {
  constructor(tasks, options, $renderHook) {
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

    super(tasks, options, $renderHook);
  }

  renderer(tasks) {
    tasks.flatMap(task => {
      if (task.hasTitle() && typeof task.initialTitle === 'string') {
        task.on('STATE', STATE => {
          task.title = `${task.initialTitle} ${STATE}`;
          // if we have customization of state flows
          if (this.options.states[STATE]) {
            const data = this.options.states[STATE];
            task.title = `${task.initialTitle} ${color[data.color](data.message)}`;
          // otherwise use the defaults
          } else {
            task.title = `${task.initialTitle} ${STATE}`;
          }
        });
      }
    });

    super.renderer(tasks);
  }
}

module.exports = DC2DebugRenderer;

