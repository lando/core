"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const getSetupEngine = require('../utils/get-setup-engine');
const getBuildkitConfig = require('../utils/get-buildkit-config');
const getContainerdPaths = require('../utils/get-containerd-paths');
const getNerdctlConfig = require('../utils/get-nerdctl-config');

module.exports = async (lando, options) => {
  const debug = require("../utils/debug-shim")(lando.log);
  const {color} = require("listr2");
  const getUrl = require("../utils/get-containerd-download-url");
  const axios = require("../utils/get-axios")();

  if (getSetupEngine(lando, options) !== 'containerd') return;

  const userConfRoot = lando.config.userConfRoot || path.join(os.homedir(), ".lando");
  const binDir = path.join(userConfRoot, "bin");
  const runDir = path.join(userConfRoot, "run");
  const configDir = path.join(userConfRoot, "config");
  const cniBinDir = lando.config.cniBinDir || "/usr/local/lib/lando/cni/bin";
  const cniConfDir = lando.config.cniNetconfPath || "/etc/lando/cni/finch";

  // System-level binary directory for root-owned binaries
  const systemBinDir = lando.config.containerdSystemBinDir || "/usr/local/lib/lando/bin";

  // Socket path — sockets go in /run/lando/ (root-owned, group-accessible via systemd RuntimeDirectory)
  const containerdPaths = getContainerdPaths(lando.config);
  const socketPath = containerdPaths.containerdSocket;

  const ensurePassword = async (ctx, task, message) => {
    if (ctx.password !== undefined || !lando.config.isInteractive) return;

    ctx.password = await task.prompt({
      type: "password",
      name: "password",
      message,
      validate: async input => {
        const opts = {debug, ignoreReturnCode: true, password: input};
        const response = await require("../utils/run-elevated")(["echo", "hello there"], opts);
        if (response.code !== 0) return response.stderr;
        return true;
      },
    });
  };

  // =========================================================================
  // Root-owned binaries: containerd, containerd-shim-runc-v2, runc, buildkitd, buildctl
  // These get downloaded to temp, then `sudo cp` to /usr/local/lib/lando/bin/
  // =========================================================================

  options.tasks.push({
    title: "Authorizing elevated access",
    id: "setup-containerd-elevated-access",
    description: "@lando/containerd authorization",
    version: "elevated access",
    hidden: true,
    comments: {
      "NOT INSTALLED": "Will prompt for sudo password before downloads",
    },
    hasRun: async () => {
      if (!lando.config.isInteractive) return true;

      const serviceFile = "/etc/systemd/system/lando-containerd.service";
      const shimBin = path.join(systemBinDir, "containerd-shim-runc-v2");
      const buildctlBin = path.join(systemBinDir, "buildctl");

      return fs.existsSync(path.join(systemBinDir, "containerd"))
        && fs.existsSync(shimBin)
        && fs.existsSync(path.join(systemBinDir, "runc"))
        && fs.existsSync(path.join(systemBinDir, "buildkitd"))
        && fs.existsSync(buildctlBin)
        && fs.existsSync(path.join(systemBinDir, "finch-daemon"))
        && fs.existsSync(path.join(binDir, "nerdctl"))
        && fs.existsSync(path.join(cniBinDir, "bridge"))
        && fs.existsSync(serviceFile);
    },
    canRun: async () => process.platform === "linux",
    task: async (ctx, task) => {
      await ensurePassword(
        ctx,
        task,
        `Enter computer password for ${lando.config.username} to set up the containerd engine`,
      );
      task.title = "Authorized elevated access";
    },
  });

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
      dependsOn: ["setup-containerd", "setup-containerd-elevated-access"],
    },
    {
      name: "finch-daemon",
      id: "setup-finch-daemon",
      bin: lando.config.finchDaemonBin || path.join(systemBinDir, "finch-daemon"),
      version: "0.22.0",
      tarballEntries: ["finch-daemon"],
      dependsOn: ["setup-containerd"],
      // finch-daemon uses a different URL pattern than containerd/nerdctl
      customUrl: true,
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

      await ensurePassword(ctx, task, `Enter computer password for ${lando.config.username} to install runc`);

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

  // Root-owned tarball binaries (containerd, buildkitd, finch-daemon)
  for (const binary of rootBinaries) {
    let url;
    if (binary.customUrl && binary.name === "finch-daemon") {
      const arch = process.arch === "arm64" ? "arm64" : "amd64";
      url = `https://github.com/runfinch/finch-daemon/releases/download/v${binary.version}/finch-daemon-${binary.version}-linux-${arch}.tar.gz`;
    } else {
      url = getUrl(binary.name === "buildkitd" ? "buildkit" : binary.name, {version: binary.version});
    }

    const task = {
      title: `Installing ${binary.name}`,
      id: binary.id,
      description: `@lando/${binary.name} (containerd engine)`,
      version: `${binary.name} v${binary.version}`,
      hasRun: async () => fs.existsSync(binary.bin),
      canRun: async () => {
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

        await ensurePassword(ctx, task, `Enter computer password for ${lando.config.username} to install ${binary.name}`);

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

    task.dependsOn = [...(binary.dependsOn || []), "setup-containerd-elevated-access"];
    options.tasks.push(task);
  }

  // =========================================================================
  // User-owned binary: nerdctl (only talks to socket, no root needed)
  // Stays in ~/.lando/bin/
  // =========================================================================

  const nerdctlVersion = "2.0.5";
  const nerdctlBin = lando.config.nerdctlBin || path.join(binDir, "nerdctl");
  const nerdctlUrl = getUrl("nerdctl", {version: nerdctlVersion});

  const cniPluginsVersion = "1.6.2";
  const cniPluginsArch = process.arch === "arm64" ? "arm64" : "amd64";
  const cniPluginsUrl = `https://github.com/containernetworking/plugins/releases/download/v${cniPluginsVersion}/cni-plugins-linux-${cniPluginsArch}-v${cniPluginsVersion}.tgz`;

  options.tasks.push({
    title: "Installing CNI plugins",
    id: "setup-cni-plugins",
    description: "@lando/cni-plugins (containerd engine)",
    version: `cni-plugins v${cniPluginsVersion}`,
    hasRun: async () => fs.existsSync(path.join(cniBinDir, "bridge")),
    canRun: async () => {
      await axios.head(cniPluginsUrl);
      return true;
    },
    dependsOn: ["setup-containerd", "setup-containerd-elevated-access"],
    task: async (ctx, task) => {
      const tmpDir = path.join(os.tmpdir(), `lando-cni-plugins-${Date.now()}`);
      fs.mkdirSync(tmpDir, {recursive: true});

      await new Promise((resolve, reject) => {
        const download = require("../utils/download-x")(cniPluginsUrl, {
          debug,
          dest: path.join(tmpDir, "cni-plugins.tgz"),
        });
        download.on("done", resolve);
        download.on("error", reject);
        download.on("progress", progress => {
          task.title = `Downloading CNI plugins ${color.dim(`[${progress.percentage}%]`)}`;
        });
      });

      task.title = "Extracting CNI plugins...";
      const {execSync} = require("child_process");
      execSync(
        `tar -xzf "${path.join(tmpDir, "cni-plugins.tgz")}" -C "${tmpDir}"`,
        {stdio: "pipe"},
      );

      await ensurePassword(ctx, task, `Enter computer password for ${lando.config.username} to install CNI plugins`);

      task.title = "Installing CNI plugins to system...";
      await require("../utils/run-elevated")(
        ["mkdir", "-p", cniBinDir],
        {debug, password: ctx.password},
      );
      await require("../utils/run-elevated")(
        ["bash", "-c", `for file in \"${tmpDir}\"/*; do [ -f \"$file\" ] && [ -x \"$file\" ] && cp \"$file\" \"${cniBinDir}\"/; done; chmod 755 \"${cniBinDir}\"/*`],
        {debug, password: ctx.password},
      );

      fs.rmSync(tmpDir, {recursive: true, force: true});
      task.title = `Installed CNI plugins to ${cniBinDir}`;
    },
  });

  options.tasks.push({
    title: "Installing nerdctl",
    id: "setup-nerdctl",
    description: "@lando/nerdctl (containerd engine)",
    version: `nerdctl v${nerdctlVersion}`,
    hasRun: async () => fs.existsSync(nerdctlBin),
    canRun: async () => {
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
    dependsOn: ["setup-containerd", "setup-runc", "setup-buildkitd", "setup-finch-daemon", "setup-nerdctl", "setup-cni-plugins"],
    hasRun: async () => {
      // Check if the systemd service exists, is enabled, AND finch-daemon socket is present
      try {
        const {execSync} = require("child_process");
        const serviceFile = '/etc/systemd/system/lando-containerd.service';
        const result = execSync("systemctl is-enabled lando-containerd.service 2>/dev/null", {
          stdio: "pipe",
          encoding: "utf8",
        }).trim();
        if (result !== "enabled") return false;
        if (!fs.existsSync(serviceFile)) return false;
        const serviceContents = fs.readFileSync(serviceFile, 'utf8');
        if (!serviceContents.includes('buildkitd --config')) return false;
        if (!serviceContents.includes(containerdPaths.buildkitSocket)) return false;
        if (!serviceContents.includes(cniBinDir)) return false;
        // Ensure CNI directory has lando group write permissions — without this,
        // ensureCniNetwork() hits EACCES at runtime. Also verify the service file
        // includes the ExecStartPre fix so permissions are maintained across restarts.
        if (!serviceContents.includes(`chgrp lando ${cniConfDir}`)) return false;
        // Ensure the service pre-creates /run/containerd/s/ (shim socket directory fix)
        if (!serviceContents.includes('/run/containerd/s')) return false;
        // Ensure the service sets NERDCTL_TOML so OCI hooks find Lando's CNI config
        // (without this, hooks deadlock on /etc/cni/net.d/.nerdctl.lock)
        if (!serviceContents.includes('NERDCTL_TOML=')) return false;
        // Ensure the service enables IP forwarding (required for container outbound internet)
        if (!serviceContents.includes('net.ipv4.ip_forward=1')) return false;
        // Ensure the service creates iptables FORWARD rules for Lando subnets
        if (!serviceContents.includes('LANDO-FORWARD')) return false;
        if (!fs.existsSync(path.join(cniBinDir, 'bridge'))) return false;
        try {
          const cniStats = fs.statSync(cniConfDir);
          if ((cniStats.mode & 0o020) === 0) return false;
        } catch { return false; }
        if (!fs.existsSync("/run/lando/finch.sock") || !fs.existsSync("/run/lando/containerd.sock")) return false;
        if (!fs.existsSync(path.join(configDir, "finch-daemon.toml"))) return false;
        if (!fs.existsSync(path.join(configDir, "buildkitd.toml"))) return false;
        // Ensure the containerd config uses /run/lando/containerd as state dir (shim socket fix)
        try {
          const ctrdConfig = fs.readFileSync(path.join(configDir, "containerd-config.toml"), 'utf8');
          if (!ctrdConfig.includes('state = "/run/lando/containerd"')) return false;
        } catch { return false; }
        return true;
      } catch {
        return false;
      }
    },
    canRun: async () => {
      // Require Linux for systemd
      if (process.platform !== "linux") return false;
      return true;
    },
    task: async (ctx, task) => {
      await ensurePassword(ctx, task, `Enter computer password for ${lando.config.username} to configure containerd service`);

      const homeDir = os.homedir();
      const username = lando.config.username || os.userInfo().username;
      const logDir = path.join(userConfRoot, 'logs');

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
      fs.mkdirSync(logDir, {recursive: true});
      const configPath = path.join(configDir, "containerd-config.toml");
      // State dir goes under /run/lando/ (tmpfs, created by systemd RuntimeDirectory=lando).
      // This ensures shim bundles are cleaned up on reboot — preventing stale-bundle
      // "get state: context deadline exceeded" errors.  The persistent user-space dir
      // (~/.lando/state/containerd) is no longer used for containerd state.
      const stateDir = "/run/lando/containerd";
      const rootDir = path.join(userConfRoot, "data", "containerd");
      // rootDir is persistent (images, snapshots); stateDir is created at service
      // start by containerd itself (it runs as root under RuntimeDirectory).
      fs.mkdirSync(rootDir, {recursive: true});

      const getContainerdConfig = require("../utils/get-containerd-config");
      const config = getContainerdConfig({
        socketPath,
        stateDir,
        rootDir,
        debug: false,
      });
      fs.writeFileSync(configPath, config, "utf8");

      const buildkitConfigPath = path.join(configDir, 'buildkitd.toml');
      const nerdctlConfigPath = path.join(configDir, 'nerdctl.toml');
      const buildkitCacheDir = path.join(userConfRoot, 'cache', 'buildkit');
      fs.mkdirSync(buildkitCacheDir, {recursive: true});
      fs.writeFileSync(buildkitConfigPath, getBuildkitConfig({
        containerdSocket: socketPath,
        buildkitSocket: containerdPaths.buildkitSocket,
        cacheDir: buildkitCacheDir,
        debug: false,
      }), 'utf8');
      fs.writeFileSync(nerdctlConfigPath, getNerdctlConfig({containerdSocket: socketPath, cniPath: cniBinDir}), 'utf8');

      // 4. Create finch-daemon config so it talks to Lando's isolated containerd socket
      const finchConfigPath = path.join(configDir, 'finch-daemon.toml');
      fs.writeFileSync(finchConfigPath, getNerdctlConfig({containerdSocket: socketPath, cniPath: cniBinDir}), 'utf8');

      // 5. Create systemd service file
      task.title = "Creating systemd service...";
      const finchSocket = containerdPaths.finchSocket;
      const finchCredSocket = containerdPaths.finchCredentialSocket;
      const finchPidFile = path.join(runDir, 'finch-daemon.pid');
      const uid = process.getuid ? process.getuid() : 1000;
      const serviceContent = [
        "[Unit]",
        "Description=Lando Containerd",
        "After=network.target",
        "",
        "[Service]",
        "Type=simple",
        "RuntimeDirectory=lando",
        // Pre-create /run/containerd/s/ — containerd v2's shim socket directory is
        // hardcoded to defaults.DefaultStateDir ("/run/containerd").  Shim socket
        // filenames are unique per containerd instance (sha256 of address+ns+id), so
        // sharing this directory with system containerd is safe.  Without this mkdir
        // the first container start fails with ENOENT for the shim socket.
        `ExecStartPre=/bin/sh -c "mkdir -p /run/containerd/s ${cniConfDir} ${cniBinDir} 2>/dev/null || true; chgrp lando ${cniConfDir} 2>/dev/null || true; chmod g+w ${cniConfDir} 2>/dev/null || true"`,
        // Enable IPv4 forwarding — required for container outbound internet access.
        // The CNI bridge plugin with isGateway:true also sets this per-container,
        // but doing it here ensures forwarding is enabled before any container starts
        // and survives across container restarts without relying on the plugin chain.
        'ExecStartPre=/bin/sh -c "sysctl -w net.ipv4.ip_forward=1 >/dev/null 2>&1 || true"',
        // Create iptables FORWARD rules for Lando's container subnets (10.4.0.0/16).
        // The CNI firewall plugin manages per-container rules in CNI-FORWARD, but
        // the host's default FORWARD policy may be DROP (common on Ubuntu/Debian).
        // These rules ensure outbound traffic from containers and return traffic to
        // containers is always accepted, regardless of the host firewall configuration.
        // Uses a dedicated LANDO-FORWARD chain to avoid interfering with other rules.
        'ExecStartPre=/bin/sh -c "' + [
          'iptables -N LANDO-FORWARD 2>/dev/null || true',
          'iptables -C FORWARD -j LANDO-FORWARD 2>/dev/null || iptables -I FORWARD 1 -j LANDO-FORWARD',
          'iptables -F LANDO-FORWARD',
          'iptables -A LANDO-FORWARD -s 10.4.0.0/16 -j ACCEPT',
          'iptables -A LANDO-FORWARD -d 10.4.0.0/16 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT',
          'iptables -A LANDO-FORWARD -j RETURN',
        ].join('; ') + '"',
        `Environment=PATH=${systemBinDir}:/usr/sbin:/usr/bin:/sbin:/bin`,
        `Environment=CONTAINERD_ADDRESS=${socketPath}`,
        // CRITICAL: NERDCTL_TOML tells nerdctl's OCI hooks where to find Lando's config.
        // Without this, hooks run as root and read the default /etc/nerdctl/nerdctl.toml
        // (which doesn't exist), falling back to /etc/cni/net.d/ for CNI — causing a
        // self-deadlock on /etc/cni/net.d/.nerdctl.lock (flock on two FDs to the same
        // file).  With this env var, hooks read Lando's nerdctl.toml and use
        // /etc/lando/cni/ for CNI configs, avoiding the system CNI directory entirely.
        `Environment=NERDCTL_TOML=${nerdctlConfigPath}`,
        // Belt-and-suspenders: set standard CNI env vars so CNI plugin libraries
        // also resolve to Lando's paths even if nerdctl's config loading is bypassed.
        `Environment=CNI_PATH=${cniBinDir}`,
        `ExecStart=${systemBinDir}/containerd --config ${configPath}`,
        `ExecStartPost=/bin/sh -c "while ! [ -S ${socketPath} ]; do sleep 0.1; done; chgrp lando ${socketPath}; chmod 660 ${socketPath}"`,
        `ExecStartPost=/bin/sh -c "${systemBinDir}/buildkitd --config ${buildkitConfigPath} >/dev/null 2>>/run/lando/buildkitd.log &"`,
        `ExecStartPost=/bin/sh -c "while ! [ -S ${containerdPaths.buildkitSocket} ]; do sleep 0.1; done; chgrp lando ${containerdPaths.buildkitSocket}; chmod 660 ${containerdPaths.buildkitSocket}"`,
        `ExecStartPost=/bin/sh -c "PATH=${binDir}:${systemBinDir}:/usr/sbin:$$PATH ${systemBinDir}/finch-daemon --config-file ${finchConfigPath} --socket-addr ${finchSocket} --socket-owner ${uid} --pidfile ${finchPidFile} --credential-socket-addr ${finchCredSocket} --credential-socket-owner ${uid} &"`,
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

      // 6. Create CNI directories and set group-writable permissions for lando group
      // Without this, ensureCniNetwork() hits EACCES when called from user-land
      task.title = "Creating CNI directories...";
      await require("../utils/run-elevated")(
        ["bash", "-c", `mkdir -p \"${cniConfDir}\" \"${cniBinDir}\"`],
        {debug, password: ctx.password},
      );
      task.title = "Setting CNI directory permissions...";
      await require("../utils/run-elevated")(
        ["chgrp", "lando", cniConfDir],
        {debug, password: ctx.password},
      );
      await require("../utils/run-elevated")(
        ["chmod", "g+w", cniConfDir],
        {debug, password: ctx.password},
      );

      // 7. Reload systemd, enable and start the service
      task.title = "Enabling and starting containerd service...";
      await require("../utils/run-elevated")(
        ["systemctl", "daemon-reload"],
        {debug, password: ctx.password},
      );
      await require("../utils/run-elevated")(
        ["systemctl", "enable", "lando-containerd.service"],
        {debug, password: ctx.password},
      );
      // Use restart (not start) in case the service was already running with old config
      await require("../utils/run-elevated")(
        ["systemctl", "restart", "lando-containerd.service"],
        {debug, password: ctx.password},
      );

      task.title = "Configured containerd service (lando-containerd.service)";
    },
  });
};
