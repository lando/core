"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

module.exports = async (lando, options) => {
  const debug = require("../utils/debug-shim")(lando.log);

  options.tasks.push({
    title: "Selecting container engine",
    id: "setup-engine-select",
    description: "@lando/engine-select",
    version: "engine selection",
    hasRun: async () => {
      // Already selected if engine is explicitly docker or containerd (not auto)
      const engine = lando.config.engine || "auto";
      return engine !== "auto";
    },
    canRun: async () => true,
    task: async (ctx, task) => {
      const engine = lando.config.engine || "auto";
      if (engine !== "auto") {
        task.title = `Container engine: ${engine}`;
        return;
      }

      let selection = "docker";

      // Non-interactive: auto-detect
      if (!process.stdin.isTTY || options.yes) {
        // Check if Docker is installed and working
        const dockerBin = lando.config.dockerBin || require("../utils/get-docker-x")();
        if (fs.existsSync(dockerBin)) {
          selection = "docker";
          debug("auto-selected docker engine (Docker binary found)");
        } else {
          // Check if containerd binaries exist
          const binDir = path.join(lando.config.userConfRoot || path.join(os.homedir(), ".lando"), "bin");
          const containerdBin = lando.config.containerdBin || path.join(binDir, "containerd");
          if (fs.existsSync(containerdBin)) {
            selection = "containerd";
            debug("auto-selected containerd engine (no Docker, containerd found)");
          } else {
            selection = "docker";
            debug("auto-selected docker engine (default)");
          }
        }
      } else {
        // Interactive: prompt user
        selection = await task.prompt({
          type: "select",
          message: "Which container engine would you like to use?",
          choices: [
            {name: "Docker (recommended — wider compatibility)", value: "docker"},
            {name: "containerd (experimental — no Docker dependency)", value: "containerd"},
          ],
          initial: 0,
        });
      }

      lando.config.engine = selection;
      lando.cache.set("engine-selection", selection, {persist: true});
      task.title = `Container engine: ${selection}`;
      debug("engine selection: %s", selection);
    },
  });
};
