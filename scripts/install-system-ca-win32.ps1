#!/

# handle params
# @NOTE: we omit DEBUG as a param because its "built in"
[CmdletBinding(PositionalBinding=$false)]
Param(
  [string]$ca,
  [switch]$noninteractive = $false
)

# error handling
$ErrorActionPreference = "Stop"

# handle uncaught errorz
trap {
  Write-Error "An unhandled error occurred: $_"
  exit 1
}

# validation
# @TODO: check if installer exists on fs?
if ([string]::IsNullOrEmpty($ca)) {
  throw "You must pass in a -CA!"
}

# enable debugging if debug is true
$DebugPreference = If ($DebugPreference -eq "Inquire") {"Continue"} Else {"SilentlyContinue"}
$debug = If ($DebugPreference -eq "Continue") {$true} Else {$false}
Write-Debug "running script with:"
Write-Debug "CA: $ca"
Write-Debug "CI: $env:CI"
Write-Debug "DEBUG: $debug"
Write-Debug "NONINTERACTIVE: $noninteractive"

# if we are in CI then reset non-interactive to true
if ($env:CI) {
  $noninteractive = $true
  Write-Debug "Running in non-interactive mode because CI=$env:CI is set."
}

# if non-interactive eg we are probably on CI lets just powershell it out as admin
if ($noninteractive -eq $true) {
  # start the process with elevated permissions
  $p = Start-Process -FilePath certutil.exe -ArgumentList "-addstore Root `"$ca`"" -Verb RunAs -Wait -PassThru
  Write-Debug "Process finished with return code: $($p.ExitCode)"

  # if there is an error then throw here
  if ($($p.ExitCode) -ne 0) {throw "CA install failed! Rerun setup with --debug or -vvv for more info!"}

# otherwise we can add directly
} else {
  # read the certificate
  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
  $cert.Import($ca)
  # add it to the store
  $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "CurrentUser"
  $store.Open("ReadWrite")
  $store.Add($cert)
  $store.Close()
}

# Debug
Write-Output "Certificate added to the Trusted Root Certification Authorities store for the current user."
