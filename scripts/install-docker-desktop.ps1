#!/

# handle params
# @NOTE: we omit DEBUG as a param because its "built in"
[CmdletBinding(PositionalBinding=$false)]
Param(
  [string]$installer,
  [switch]$acceptlicense = $false
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
$debug = If ($DebugPreference -eq "Continue") {$true} Else {$false}
Write-Debug "running script with:"
Write-Debug "INSTALLER: $installer"
Write-Debug "ACCEPT LICENSE: $acceptlicense"
Write-Debug "DEBUG: $debug"

# validation
# @TODO: check if installer exists on fs?
if ([string]::IsNullOrEmpty($installer))
{
  throw "You must pass in an -installer!"
}

# Start arg stuff
$options = "--backend=wsl-2"
# if debug mode is off then make the installer quiet
if ($debug -eq $false) {$options = "$options --quiet"}
# if accept license is true then add that as well
if ($acceptlicense -eq $true) {$options = "$options --accept-license"}

# Install
Write-Debug "Running $installer with 'install $options'"
$p = Start-Process -FilePath "$installer" -ArgumentList "install $options" -Wait -PassThru
Write-Debug "Process finished with return code: $($p.ExitCode)"

# If there is an error then throw here
if ($($p.ExitCode) -ne 0) {throw "Docker Desktop install failed! Rerun setup with --debug or -vvv for more info!"}
