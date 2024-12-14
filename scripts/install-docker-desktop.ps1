#!/

# handle params
[CmdletBinding(PositionalBinding=$false)]
Param(
  [string]$Installer,
  [switch]$AcceptLicense = $false
)

# error handling
$ErrorActionPreference = "Stop"

# Handle uncaught errorz
trap {
  Write-Error "An unhandled error occurred: $_"
  exit 1
}

# enable debugging if debug is true
$DebugPreference = If ($DebugPreference -eq "Inquire") {"Continue"} Else {"SilentlyContinue"}
$Debug = If ($DebugPreference -eq "Continue") {$true} Else {$false}
Write-Debug "running script with:"
Write-Debug "INSTALLER: $Installer"
Write-Debug "ACCEPT LICENSE: $AcceptLicense"
Write-Debug "DEBUG: $Debug"

# validation
# @TODO: check if installer exists on fs?
if ([string]::IsNullOrEmpty($Installer)) {
  throw "You must pass in an -Installer!"
}

# Start arg stuff
$options = "--backend=wsl-2"
# if debug mode is off then make the installer quiet
if ($Debug -eq $false) {$options = "$options --quiet"}
# if accept license is true then add that as well
if ($AcceptLicense -eq $true) {$options = "$options --accept-license"}

# Install
Write-Debug "Running $Installer with 'install $options'"
$p = Start-Process -FilePath "$Installer" -ArgumentList "install $options" -Wait -PassThru
Write-Debug "Process finished with return code: $($p.ExitCode)"

# If there is an error then throw here
if ($($p.ExitCode) -ne 0) {throw "Docker Desktop install failed! Rerun setup with --debug or -vvv for more info!"}
