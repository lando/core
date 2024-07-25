$ErrorActionPreference = "Stop"

# Lando is impatient and will keep trying to start Docker Desktop if it's not ready.
# Using a mutex to ensure only one instance of this script runs at a time.
$mutexName = "Global\DockerDesktopStartLock"
$mutex = New-Object System.Threading.Mutex($false, $mutexName)
$lockAcquired = $false

try {
  $lockAcquired = $mutex.WaitOne(0, $false)
  if (-not $lockAcquired) {
    Write-Output "Another instance of the script is already starting Docker Desktop."
    exit 0
  }

  $AppName = "Docker Desktop"
  $app = "shell:AppsFolder\$((Get-StartApps $AppName | Select-Object -First 1).AppId)"
  $startMenuPath = [System.Environment]::GetFolderPath("CommonStartMenu")
  $shortcutPath = Join-Path $startMenuPath "Docker Desktop.lnk"
  $programFiles = [System.Environment]::GetFolderPath("ProgramFiles")
  $exePath = Join-Path $programFiles "Docker\Docker\Docker Desktop.exe"

  if (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue) {
    Write-Output "Docker Desktop is already running."
    exit 0
  }

  function Start-App($path) {
    Write-Debug "Attempting to start $path"
    if (Test-Path $path) {
      Start-Process $path
      return $true
    }
    return $false
  }

  # Try to start via the App, Start Menu shortcut, then Program Files
  if (!(Start-App $app) -and !(Start-App $shortcutPath) -and !(Start-App $exePath)) {
    Write-Output "Docker Desktop could not be started. Please check the installation."
    exit 1
  }

    # Wait for Docker Desktop to start (Lando only waits 25 seconds before giving up)
  $timeout = 25
  for ($i = $timeout; $i -gt 0; $i--) {
    if (($i % 5) -eq 0) { Write-Debug "Waiting for Docker Desktop to start ($i seconds remaining)" }
    Start-Sleep -Seconds 1

    if (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue) {
      try {
        docker info -f '{{.ServerVersion}}' 2>$null | Out-Null
        Write-Host "Docker Desktop is running."
        break
      } catch {
        # Ignore error
      }
    }
  }
}
catch {
  Write-Error "An error occurred: $_"
  exit 1
}
finally {
  if ($lockAcquired) {
    $mutex.ReleaseMutex()
  }
  $mutex.Dispose()
}
