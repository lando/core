#!/

# handle params
# @NOTE: we omit DEBUG as a param because its "built in"
[CmdletBinding(PositionalBinding=$false)]
Param(
  [string]$installer,
  [switch]$acceptlicense = 0
)

# error handling
$ErrorActionPreference = "Stop"
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
Write-Debug "Installer completed with exit code $p.ExitCode"

exit $LASTEXITCODE
