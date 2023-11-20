#!/
# handle params
[CmdletBinding(PositionalBinding=$false)]
Param(
  [string]$installer,
  [string]$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
)

# error handling
$ErrorActionPreference = "Stop"

# validation
# @TODO: check if installer exists on fs?
if ([string]::IsNullOrEmpty($installer))
{
  throw "You must pass in an -installer!"
}

# Install
Start-Process -FilePath "$installer" -ArgumentList "install --quiet --backend=wsl-2" -Wait

# Log
Write-Output "Install completed!"
