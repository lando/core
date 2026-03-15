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
      tarballEntries: ["bin/containerd", "bin/containerd-shim-runc-v2"],
    },
    {
      name: "buildkitd",
      id: "setup-buildkitd",
      bin: lando.config.buildkitdBin || path.join(binDir, "buildkitd"),
      version: "0.18.2",
      tarballEntries: ["bin/buildkitd", "bin/buildctl"],
      dependsOn: ["setup-containerd"],
    },
    {
      name: "nerdctl",
      id: "setup-nerdctl",
      bin: lando.config.nerdctlBin || path.join(binDir, "nerdctl"),
      version: "2.0.5",
      tarballEntries: ["nerdctl", "containerd-rootless-setuptool.sh", "containerd-rootless.sh"],
      dependsOn: ["setup-buildkitd"],
    },
  ];

  // Add runc (direct binary, not a tarball)
  const runcVersion = "1.2.5";
  const runcArch = process.arch === "arm64" ? "arm64" : "amd64";
  const runcBin = path.join(binDir, "runc");
  const runcUrl = `https://github.com/opencontainers/runc/releases/download/v${runcVersion}/runc.${runcArch}`;

  options.tasks.push({
    title: "Installing runc",
    id: "setup-runc",
    description: "@lando/runc (containerd engine)",
    version: `runc v${runcVersion}`,
    hasRun: async () => fs.existsSync(runcBin),
    canRun: async () => {
      if (engine === "docker") return false;
      if (engine === "auto") {
        try {
          if (lando.engine && lando.engine.dockerInstalled) return false;
        } catch { /* continue */ }
      }
      await axios.head(runcUrl);
      return true;
    },
    dependsOn: ["setup-containerd"],
    task: async (ctx, task) => {
      task.title = `Downloading runc...`;
      const download = require("../utils/download-x")(runcUrl, {debug, dest: runcBin});
      await new Promise((resolve, reject) => {
        download.on("done", result => {
          task.title = "Downloaded runc";
          resolve(result);
        });
        download.on("error", error => reject(error));
        download.on("progress", progress => {
          task.title = `Downloading runc ${color.dim(`[${progress.percentage}%]`)}`;
        });
      });

      fs.chmodSync(runcBin, 0o755);
      task.title = `Installed runc to ${runcBin}`;
    },
  });

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

        // Extract binaries from the tarball
        task.title = `Extracting ${binary.name}...`;
        const {execSync} = require("child_process");
        const entries = binary.tarballEntries || [binary.tarballEntry];
        execSync(
          `tar -xzf "${path.join(tmpDir, binary.name + ".tar.gz")}" -C "${tmpDir}" ${entries.map(e => `"${e}"`).join(" ")}`,
          {stdio: "pipe"},
        );

        // Move all extracted files to bin dir
        for (const entry of entries) {
          const extracted = path.join(tmpDir, entry);
          const destPath = path.join(binDir, path.basename(entry));
          fs.copyFileSync(extracted, destPath);
          require("../utils/make-executable")([path.basename(destPath)], path.dirname(destPath));
        }

        // Cleanup temp
        fs.rmSync(tmpDir, {recursive: true, force: true});

        task.title = `Installed ${binary.name} to ${dest}`;
      },
    };

    if (binary.dependsOn) task.dependsOn = binary.dependsOn;
    options.tasks.push(task);
  }
};
