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
  const runDir = path.join(userConfRoot, "run");
  const configDir = path.join(userConfRoot, "config");

  // System-level binary directory for root-owned binaries
  const systemBinDir = lando.config.containerdSystemBinDir || "/usr/local/lib/lando/bin";

  // Socket path — sockets go in /run/lando/ (root-owned, group-accessible via systemd RuntimeDirectory)
  const socketPath = lando.config.containerdSocket || "/run/lando/containerd.sock";

  // =========================================================================
  // Root-owned binaries: containerd, containerd-shim-runc-v2, runc, buildkitd, buildctl
  // These get downloaded to temp, then `sudo cp` to /usr/local/lib/lando/bin/
  // =========================================================================

  // Binary definitions for root-owned binaries (installed to systemBinDir via sudo)
  const rootBinaries = [
    {
      name: "containerd",
      id: "setup-containerd",
      bin: lando.config.containerdBin || path.join(systemBinDir, "containerd"),
      version: "2.0.4",
      tarballEntries: ["bin/containerd", "bin/containerd-shim-runc-v2"],
    },
    {
      name: "buildkitd",
      id: "setup-buildkitd",
      bin: lando.config.buildkitdBin || path.join(systemBinDir, "buildkitd"),
      version: "0.18.2",
      tarballEntries: ["bin/buildkitd", "bin/buildctl"],
      dependsOn: ["setup-containerd"],
    },
  ];

  // runc (direct binary download, also root-owned)
  const runcVersion = "1.2.5";
  const runcArch = process.arch === "arm64" ? "arm64" : "amd64";
  const runcBin = path.join(systemBinDir, "runc");
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
      // Download to temp location first
      const tmpFile = path.join(os.tmpdir(), `lando-runc-${Date.now()}`);

      task.title = `Downloading runc...`;
      const download = require("../utils/download-x")(runcUrl, {debug, dest: tmpFile});
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

      // Prompt for password if interactive and we don't have it
      if (ctx.password === undefined && lando.config.isInteractive) {
        ctx.password = await task.prompt({
          type: "password",
          name: "password",
          message: `Enter computer password for ${lando.config.username} to install runc`,
          validate: async input => {
            const opts = {debug, ignoreReturnCode: true, password: input};
            const response = await require("../utils/run-elevated")(["echo", "hello there"], opts);
            if (response.code !== 0) return response.stderr;
            return true;
          },
        });
      }

      // sudo cp to system bin dir
      task.title = "Installing runc to system...";
      await require("../utils/run-elevated")(
        ["mkdir", "-p", systemBinDir],
        {debug, password: ctx.password},
      );
      await require("../utils/run-elevated")(
        ["cp", tmpFile, runcBin],
        {debug, password: ctx.password},
      );
      await require("../utils/run-elevated")(
        ["chmod", "755", runcBin],
        {debug, password: ctx.password},
      );

      // Cleanup temp
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

      task.title = `Installed runc to ${runcBin}`;
    },
  });

  // Root-owned tarball binaries (containerd, buildkitd)
  for (const binary of rootBinaries) {
    const url = getUrl(binary.name === "buildkitd" ? "buildkit" : binary.name, {version: binary.version});

    const task = {
      title: `Installing ${binary.name}`,
      id: binary.id,
      description: `@lando/${binary.name} (containerd engine)`,
      version: `${binary.name} v${binary.version}`,
      hasRun: async () => fs.existsSync(binary.bin),
      canRun: async () => {
        if (engine === "auto") {
          try {
            if (lando.engine && lando.engine.dockerInstalled) return false;
          } catch {}
        }
        await axios.head(url);
        return true;
      },
      task: async (ctx, task) => {
        // Download the tarball to temp
        const tmpDir = path.join(os.tmpdir(), `lando-${binary.name}-${Date.now()}`);
        fs.mkdirSync(tmpDir, {recursive: true});

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

        // Extract binaries from the tarball to temp
        task.title = `Extracting ${binary.name}...`;
        const {execSync} = require("child_process");
        const entries = binary.tarballEntries || [];
        execSync(
          `tar -xzf "${path.join(tmpDir, binary.name + ".tar.gz")}" -C "${tmpDir}" ${entries.map(e => `"${e}"`).join(" ")}`,
          {stdio: "pipe"},
        );

        // Prompt for password if interactive and we don't have it
        if (ctx.password === undefined && lando.config.isInteractive) {
          ctx.password = await task.prompt({
            type: "password",
            name: "password",
            message: `Enter computer password for ${lando.config.username} to install ${binary.name}`,
            validate: async input => {
              const opts = {debug, ignoreReturnCode: true, password: input};
              const response = await require("../utils/run-elevated")(["echo", "hello there"], opts);
              if (response.code !== 0) return response.stderr;
              return true;
            },
          });
        }

        // sudo cp extracted files to system bin dir
        task.title = `Installing ${binary.name} to system...`;
        await require("../utils/run-elevated")(
          ["mkdir", "-p", systemBinDir],
          {debug, password: ctx.password},
        );

        for (const entry of entries) {
          const extracted = path.join(tmpDir, entry);
          const destPath = path.join(systemBinDir, path.basename(entry));
          await require("../utils/run-elevated")(
            ["cp", extracted, destPath],
            {debug, password: ctx.password},
          );
          await require("../utils/run-elevated")(
            ["chmod", "755", destPath],
            {debug, password: ctx.password},
          );
        }

        // Cleanup temp
        fs.rmSync(tmpDir, {recursive: true, force: true});

        task.title = `Installed ${binary.name} to ${systemBinDir}`;
      },
    };

    if (binary.dependsOn) task.dependsOn = binary.dependsOn;
    options.tasks.push(task);
  }

  // =========================================================================
  // User-owned binary: nerdctl (only talks to socket, no root needed)
  // Stays in ~/.lando/bin/
  // =========================================================================

  const nerdctlVersion = "2.0.5";
  const nerdctlBin = lando.config.nerdctlBin || path.join(binDir, "nerdctl");
  const nerdctlUrl = getUrl("nerdctl", {version: nerdctlVersion});

  options.tasks.push({
    title: "Installing nerdctl",
    id: "setup-nerdctl",
    description: "@lando/nerdctl (containerd engine)",
    version: `nerdctl v${nerdctlVersion}`,
    hasRun: async () => fs.existsSync(nerdctlBin),
    canRun: async () => {
      if (engine === "auto") {
        try {
          if (lando.engine && lando.engine.dockerInstalled) return false;
        } catch {}
      }
      await axios.head(nerdctlUrl);
      return true;
    },
    dependsOn: ["setup-buildkitd"],
    task: async (ctx, task) => {
      // Download the tarball
      const tmpDir = path.join(os.tmpdir(), `lando-nerdctl-${Date.now()}`);
      fs.mkdirSync(tmpDir, {recursive: true});
      fs.mkdirSync(binDir, {recursive: true});

      await new Promise((resolve, reject) => {
        const download = require("../utils/download-x")(nerdctlUrl, {
          debug,
          dest: path.join(tmpDir, "nerdctl.tar.gz"),
        });
        download.on("done", resolve);
        download.on("error", reject);
        download.on("progress", progress => {
          task.title = `Downloading nerdctl ${color.dim(`[${progress.percentage}%]`)}`;
        });
      });

      // Extract only nerdctl (no rootless scripts needed for rootful mode)
      task.title = "Extracting nerdctl...";
      const {execSync} = require("child_process");
      execSync(
        `tar -xzf "${path.join(tmpDir, "nerdctl.tar.gz")}" -C "${tmpDir}" "nerdctl"`,
        {stdio: "pipe"},
      );

      // Copy to user bin dir
      const extracted = path.join(tmpDir, "nerdctl");
      const destPath = path.join(binDir, "nerdctl");
      fs.copyFileSync(extracted, destPath);
      require("../utils/make-executable")(["nerdctl"], binDir);

      // Cleanup temp
      fs.rmSync(tmpDir, {recursive: true, force: true});

      task.title = `Installed nerdctl to ${destPath}`;
    },
  });

  // =========================================================================
  // Systemd service configuration task
  // Runs AFTER all binary installs are complete
  // =========================================================================

  options.tasks.push({
    title: "Configuring containerd service",
    id: "setup-containerd-service",
    description: "@lando/containerd-service (systemd)",
    version: "containerd service v1.0.0",
    dependsOn: ["setup-containerd", "setup-runc", "setup-buildkitd"],
    hasRun: async () => {
      // Check if the systemd service exists and is enabled
      try {
        const {execSync} = require("child_process");
        const result = execSync("systemctl is-enabled lando-containerd.service 2>/dev/null", {
          stdio: "pipe",
          encoding: "utf8",
        }).trim();
        return result === "enabled";
      } catch {
        return false;
      }
    },
    canRun: async () => {
      if (engine === "docker") return false;
      if (engine === "auto") {
        try {
          if (lando.engine && lando.engine.dockerInstalled) return false;
        } catch {}
      }
      // Require Linux for systemd
      if (process.platform !== "linux") return false;
      return true;
    },
    task: async (ctx, task) => {
      // Prompt for password if interactive and we don't have it
      if (ctx.password === undefined && lando.config.isInteractive) {
        ctx.password = await task.prompt({
          type: "password",
          name: "password",
          message: `Enter computer password for ${lando.config.username} to configure containerd service`,
          validate: async input => {
            const opts = {debug, ignoreReturnCode: true, password: input};
            const response = await require("../utils/run-elevated")(["echo", "hello there"], opts);
            if (response.code !== 0) return response.stderr;
            return true;
          },
        });
      }

      const homeDir = os.homedir();
      const username = lando.config.username || os.userInfo().username;

      // 1. Create lando group if it doesn't exist
      task.title = "Creating lando group...";
      await require("../utils/run-elevated")(
        ["bash", "-c", "getent group lando >/dev/null 2>&1 || groupadd lando"],
        {debug, password: ctx.password},
      );

      // 2. Add current user to lando group
      task.title = `Adding ${username} to lando group...`;
      await require("../utils/run-elevated")(
        ["usermod", "-aG", "lando", username],
        {debug, password: ctx.password},
      );

      // 3. Write containerd config to ~/.lando/config/containerd-config.toml
      task.title = "Writing containerd config...";
      fs.mkdirSync(configDir, {recursive: true});
      const configPath = path.join(configDir, "containerd-config.toml");
      const stateDir = path.join(userConfRoot, "state", "containerd");
      const rootDir = path.join(userConfRoot, "data", "containerd");
      fs.mkdirSync(stateDir, {recursive: true});
      fs.mkdirSync(rootDir, {recursive: true});

      const getContainerdConfig = require("../utils/get-containerd-config");
      const config = getContainerdConfig({
        socketPath,
        stateDir,
        rootDir,
        debug: false,
      });
      fs.writeFileSync(configPath, config, "utf8");

      // 4. Create systemd service file
      task.title = "Creating systemd service...";
      const finchSocket = "/run/lando/finch.sock";
      const serviceContent = [
        "[Unit]",
        "Description=Lando Containerd",
        "After=network.target",
        "",
        "[Service]",
        "Type=simple",
        "RuntimeDirectory=lando",
        `ExecStart=${systemBinDir}/containerd --config ${configPath}`,
        `ExecStartPost=/bin/sh -c "while ! [ -S ${socketPath} ]; do sleep 0.1; done; chgrp lando ${socketPath}; chmod 660 ${socketPath}"`,
        `ExecStartPost=/bin/sh -c "while ! [ -S ${finchSocket} ]; do sleep 0.1; done; chgrp lando ${finchSocket}; chmod 660 ${finchSocket}"`,
        "Restart=always",
        "RestartSec=5",
        "",
        "[Install]",
        "WantedBy=multi-user.target",
        "",
      ].join("\n");

      // Write service file to temp then sudo cp to /etc/systemd/system/
      const tmpServiceFile = path.join(os.tmpdir(), `lando-containerd-${Date.now()}.service`);
      fs.writeFileSync(tmpServiceFile, serviceContent, "utf8");

      await require("../utils/run-elevated")(
        ["cp", tmpServiceFile, "/etc/systemd/system/lando-containerd.service"],
        {debug, password: ctx.password},
      );
      try { fs.unlinkSync(tmpServiceFile); } catch { /* ignore */ }

      // 5. /run/lando/ is created automatically by systemd via RuntimeDirectory=lando
      // Ensure ~/.lando/run/ still exists for PID files
      fs.mkdirSync(runDir, {recursive: true});

      // 6. Reload systemd, enable and start the service
      task.title = "Enabling and starting containerd service...";
      await require("../utils/run-elevated")(
        ["systemctl", "daemon-reload"],
        {debug, password: ctx.password},
      );
      await require("../utils/run-elevated")(
        ["systemctl", "enable", "lando-containerd.service"],
        {debug, password: ctx.password},
      );
      await require("../utils/run-elevated")(
        ["systemctl", "start", "lando-containerd.service"],
        {debug, password: ctx.password},
      );

      task.title = "Configured containerd service (lando-containerd.service)";
    },
  });
};
