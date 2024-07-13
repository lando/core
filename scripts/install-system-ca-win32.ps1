#!/

# handle params
# @NOTE: we omit DEBUG as a param because its "built in"
[CmdletBinding(PositionalBinding=$false)]
Param(
  [string]$ca
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
Write-Debug "CA: $ca"
Write-Debug "DEBUG: $debug"

# validation
# @TODO: check if installer exists on fs?
if ([string]::IsNullOrEmpty($ca))
{
  throw "You must pass in a -CA!"
}

# Read the certificate
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$cert.Import($ca)

# Add the certificate to the Current User Trusted Root Certification Authorities store
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "CurrentUser"
$store.Open("ReadWrite")
$store.Add($cert)
$store.Close()

Write-Output "Certificate added to the Trusted Root Certification Authorities store for the current user."
