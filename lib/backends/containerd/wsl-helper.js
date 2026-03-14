"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const {execSync} = require("child_process");

class WslHelper {
  constructor(opts = {}) {
    this.debug = opts.debug || (() => {});
    this.userConfRoot = opts.userConfRoot || path.join(os.homedir(), ".lando");
  }

  static isWsl() {
    if (process.platform !== "linux") return false;
    try {
      const version = fs.readFileSync("/proc/version", "utf8");
      return version.toLowerCase().includes("microsoft");
    } catch {
      return false;
    }
  }

  async isDockerDesktopRunning() {
    const sockets = [
      "/mnt/wsl/docker-desktop/docker-desktop-proxy",
      "/var/run/docker.sock",
    ];
    return sockets.some(s => fs.existsSync(s));
  }

  async ensureSocketPermissions(socketPath) {
    const dir = path.dirname(socketPath);
    try {
      fs.mkdirSync(dir, {recursive: true});
      const uid = process.getuid();
      const gid = process.getgid();
      fs.chownSync(dir, uid, gid);
      this.debug("ensured socket directory permissions for %s", dir);
    } catch (err) {
      this.debug("could not set socket directory permissions: %s", err.message);
    }
  }

  getContainerdConfig(socketPath, stateDir, rootDir) {
    return [
      "version = 3",
      "",
      "[grpc]",
      `  address = "${socketPath}"`,
      "",
      "[state]",
      `  directory = "${stateDir}"`,
      "",
      "[root]",
      `  path = "${rootDir}"`,
      "",
      "# Disable overlapping plugins when Docker Desktop may also be running",
      "[plugins]",
      "  [plugins.io.containerd.grpc.v1.cri]",
      "    disable = true",
    ].join("\n");
  }

  async writeConfig(configPath, socketPath, stateDir, rootDir) {
    const dir = path.dirname(configPath);
    fs.mkdirSync(dir, {recursive: true});
    const content = this.getContainerdConfig(socketPath, stateDir, rootDir);
    fs.writeFileSync(configPath, content, "utf8");
    this.debug("wrote containerd config to %s", configPath);
  }
}

module.exports = WslHelper;
