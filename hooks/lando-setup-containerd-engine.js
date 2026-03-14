"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

module.exports = async (lando, options) => {
  const debug = require("../utils/debug-shim")(lando.log);
  const {color} = require("listr2");
  const getUrl = require("../utils/get-containerd-download-url");
  const axios = require("../utils/get-axios")();

  // Only run for containerd or auto engine selection
  const engine = lando.config.engine || "auto";
  if (engine === "docker") return;

  const userConfRoot = lando.config.userConfRoot || path.join(os.homedir(), ".lando");
  const binDir = path.join(userConfRoot, "bin");

  // Binary definitions
  const binaries = [
    {
      name: "containerd",
      id: "setup-containerd",
      bin: lando.config.containerdBin || path.join(binDir, "containerd"),
      version: "2.0.4",
      tarballEntry: "bin/containerd",
    },
    {
      name: "buildkitd",
      id: "setup-buildkitd",
      bin: lando.config.buildkitdBin || path.join(binDir, "buildkitd"),
      version: "0.18.2",
      tarballEntry: "bin/buildkitd",
      dependsOn: ["setup-containerd"],
    },
    {
      name: "nerdctl",
      id: "setup-nerdctl",
      bin: lando.config.nerdctlBin || path.join(binDir, "nerdctl"),
      version: "2.0.5",
      tarballEntry: "nerdctl",
      dependsOn: ["setup-buildkitd"],
    },
  ];

  for (const binary of binaries) {
    const url = getUrl(binary.name === "buildkitd" ? "buildkit" : binary.name, {version: binary.version});

    const task = {
      title: `Installing ${binary.name}`,
      id: binary.id,
      description: `@lando/${binary.name} (containerd engine)`,
      version: `${binary.name} v${binary.version}`,
      hasRun: async () => fs.existsSync(binary.bin),
      canRun: async () => {
        if (engine === "auto") {
          // In auto mode, skip containerd setup if Docker is already working
          try {
            if (lando.engine && lando.engine.dockerInstalled) return false;
          } catch {}
        }
        await axios.head(url);
        return true;
      },
      task: async (ctx, task) => {
        // Download the tarball
        const tmpDir = path.join(os.tmpdir(), `lando-${binary.name}-${Date.now()}`);
        fs.mkdirSync(tmpDir, {recursive: true});
        fs.mkdirSync(binDir, {recursive: true});

        await new Promise((resolve, reject) => {
          const download = require("../utils/download-x")(url, {
            debug,
            dest: path.join(tmpDir, `${binary.name}.tar.gz`),
          });
          download.on("done", resolve);
          download.on("error", reject);
          download.on("progress", progress => {
            task.title = `Downloading ${binary.name} ${color.dim(`[${progress.percentage}%]`)}`;
          });
        });

        // Extract the specific binary from the tarball
        task.title = `Extracting ${binary.name}...`;
        const {execSync} = require("child_process");
        execSync(
          `tar -xzf "${path.join(tmpDir, binary.name + ".tar.gz")}" -C "${tmpDir}" "${binary.tarballEntry}"`,
          {stdio: "pipe"},
        );

        // Move to bin dir
        const extracted = path.join(tmpDir, binary.tarballEntry);
        const dest = binary.bin;
        fs.copyFileSync(extracted, dest);
        require("../utils/make-executable")([path.basename(dest)], path.dirname(dest));

        // Cleanup temp
        fs.rmSync(tmpDir, {recursive: true, force: true});

        task.title = `Installed ${binary.name} to ${dest}`;
      },
    };

    if (binary.dependsOn) task.dependsOn = binary.dependsOn;
    options.tasks.push(task);
  }
};
