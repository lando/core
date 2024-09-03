const os = require('os');
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

/**
 * The WslManager class is a singleton that provides methods to check the state of WSL and Docker Desktop
 * for Windows. It uses a static cache object to store the state of these checks so subsequent calls are
 * can immediately return the cached result.
 *
 * @since 3.22.0
 */
class WslManager {
  /**
   * A static instance of the WslManager class.
   * @type {WslManager|null}
   */
  static instance = null;

  /**
   * A cache object to store the state of WSL.
   *
   * @type {Object}
   * @property {boolean} isRunningInWSL - Indicates if the current environment is running in WSL.
   * @property {boolean} isWindowsInteropEnabled - Indicates if Windows interoperability is enabled in WSL.
   * @property {boolean} isDockerDesktopIntegrationEnabled - Indicates if Docker Desktop integration is enabled.
   * @property {boolean} isDockerDesktopInstalledOnWindows - Indicates if Docker Desktop is installed on Windows.
   * @property {boolean} isUsingDockerDesktopForWindows - Indicates if using Docker Desktop for Windows WSL2 integration.
   * @property {object} windowsPaths - An object containing the paths to important Windows directories.
   */
  cache = {};

  /**
   * Constructor for the WslManager class.
   *
   * @return {WslManager} The singleton instance of the WslManager class.
   */
  constructor() {
    if (WslManager.instance === null) {
      WslManager.instance = this;
    }
    return WslManager.instance;
  }

  /**
   * Gets the path to the Docker settings file in the Windows filesystem.
   *
   * @private
   * @return {string|null} The path to the Docker settings file, or null if not in WSL.
   */
  getDockerSettingsPath() {
    try {
      const appDataPath = this.getWindowsPath('ApplicationData');
      return path.join(appDataPath, 'Docker', 'settings.json');
    } catch (error) {
      return null;
    }
  }

  /**
   * Gets the path to a Windows directory.
   *
   * @since 3.22.0
   * @param {string} pathName - The name of the path to get.
   * Valid names are: UserProfile, ApplicationData, LocalApplicationData, ProgramData, ProgramFiles.
   * @throws {Error} If the path name is invalid or Windows interoperability is not enabled.
   * @return {string} The path to the Windows directory.
   */
  getWindowsPath(pathName) {
    if (!this.isWindowsInteropEnabled()) throw new Error('Windows interoperability is not enabled');

    const windowsPathNames = [
      'UserProfile',
      'ApplicationData',
      'LocalApplicationData',
      'ProgramFiles',
    ];

    if (!windowsPathNames.includes(pathName)) {
      throw new Error(`Invalid path name '${pathName}'. Valid path names are: ${windowsPathNames.join(', ')}.`);
    }

    // TODO: This is expensive and never changes. We should also cache the result of this to the file system.
    if (this.cache.windowsPaths === undefined) {
      try {
        const pathCommands = windowsPathNames.map(pathName => `[System.Environment]::GetFolderPath(\'${pathName}\')`);
        const combinedCommands = pathCommands.join('; ');
        const output = execSync(`powershell.exe -Command "${combinedCommands}"`).toString();
        const winPaths = output.split('\n').map(path => path.trim());
        this.cache.windowsPaths = Object.fromEntries(
          windowsPathNames.map((name, index) => [name, this.getWslPath(winPaths[index])]),
        );
      } catch (error) {
        throw new Error(`Failed to get Windows path: ${error.message}`);
      }
    }
    return this.cache.windowsPaths[pathName];
  }

  /**
   * Converts a Windows path to a WSL path.
   *
   * @since 3.22.0
   * @param {string} windowsPath - The Windows path to convert.
   * @throws {Error} If the path is not in WSL.
   * @return {string} The WSL path.
   */
  getWslPath(windowsPath) {
    if (!this.isRunningInWSL()) throw new Error('Must be running in WSL to convert Windows paths to WSL paths');

    try {
      const wslPath = execSync(`wslpath -a "${windowsPath}"`).toString().trim();
      return wslPath;
    } catch (error) {
      throw new Error(`Failed to convert Windows path to WSL path: ${error.message}`);
    }
  }

  /**
   * Checks if the current WSL distro is the default one.
   *
   * @since 3.22.0
   * @return {boolean} True if the current distro is the default, false otherwise.
   */
  isDefaultWslDistro() {
    if (this.cache.isDefaultWslDistro === undefined) {
      try {
        const output = execSync('wsl.exe -l', {encoding: 'utf16le'}).toString();
        const defaultDistro = output.match(/(\S+)\s+\(Default\)/);
        this.cache.isDefaultWslDistro = defaultDistro && defaultDistro[1] === process.env.WSL_DISTRO_NAME;
      } catch (error) {
        this.cache.isDefaultWslDistro = false;
      }
    }
    return this.cache.isDefaultWslDistro;
  }

  /**
   * Checks if Docker Desktop integration is enabled for the current WSL distro.
   *
   * @since 3.22.0
   * @return {boolean} True if integration is enabled, false otherwise.
   */
  isDockerDesktopIntegrationEnabled() {
    if (this.cache.isDockerDesktopIntegrationEnabled === undefined) {
      if (!this.isRunningInWSL() || !this.isWindowsInteropEnabled()) {
        this.cache.isDockerDesktopIntegrationEnabled = false;
        return false;
      }

      // Check if docker.exe is in /mnt/c using 'which'
      try {
        execSync('which docker.exe', {encoding: 'utf8'}).trim();
      } catch (error) {
        this.cache.isDockerDesktopIntegrationEnabled = false;
        return false;
      }

      const settingsPath = this.getDockerSettingsPath();
      if (!settingsPath) {
        this.cache.isDockerDesktopIntegrationEnabled = false;
        return false;
      }

      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const currentDistro = process.env.WSL_DISTRO_NAME;

        this.cache.isDockerDesktopIntegrationEnabled =
          (settings.enableIntegrationWithDefaultWslDistro && this.isDefaultWslDistro()) ||
          (settings.integratedWslDistros?.includes(currentDistro));
      } catch (error) {
        this.cache.isDockerDesktopIntegrationEnabled = false;
      }
    }
    return this.cache.isDockerDesktopIntegrationEnabled;
  }

  /**
   * Checks if the current environment is running in WSL.
   *
   * @since 3.22.0
   * @return {boolean} True if running in WSL, false otherwise.
   */
  isRunningInWSL() {
    if (this.cache.isRunningInWSL === undefined) {
      // All WSL distros run on Microsoft's fork of the Linux kernel.
      this.cache.isRunningInWSL = os
        .release()
        .toLowerCase()
        .includes('microsoft');
    }
    return this.cache.isRunningInWSL;
  }

  /**
   * Checks if Windows interoperability is enabled in WSL. This means that the WSL
   * distro can access Windows paths and binaries.
   *
   * @since 3.22.0
   * @return {boolean} True if Windows interoperability is enabled, false otherwise.
   */
  isWindowsInteropEnabled() {
    if (this.cache.isWindowsInteropEnabled === undefined) {
      if (!this.isRunningInWSL()) {
        return false;
      }

      try {
        execSync('wslpath c:\\');
        this.cache.isWindowsInteropEnabled = true;
      } catch (error) {
        this.cache.isWindowsInteropEnabled = false;
      }
    }
    return this.cache.isWindowsInteropEnabled;
  }
}

module.exports = new WslManager();
