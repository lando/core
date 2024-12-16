#!/

# handle params
# @NOTE: we omit DEBUG as a param because its "built in"
[CmdletBinding(PositionalBinding=$false)]
Param(
  [string]$cmd
)

# error handling
$ErrorActionPreference = "Stop"

# enable debugging if debug is true
$DebugPreference = If ($DebugPreference -eq "Inquire") {"Continue"} Else {"SilentlyContinue"}
$debug = If ($DebugPreference -eq "Continue") {$true} Else {$false}

# figure out the command and setup fake fds
$command = $cmd.split(',')
$stdoutfile = Join-Path $Env:Temp $([guid]::NewGuid().ToString())
$stderrfile = Join-Path $Env:Temp $([guid]::NewGuid().ToString())

# DEBUG
Write-Debug "running elevated command:"
Write-Debug "CMD: $command"
Write-Debug "DEBUG: $debug"
Write-Debug "STDOUTPATH: $stdoutfile"
Write-Debug "STDERRPATH: $stderrfile"

# add our fake fds to the command
$command += ">'$stdoutfile'"
$command += "2>'$stderrfile'"

# run the process
$process = Start-Process powershell -Wait -PassThru -Verb RunAs -WindowStyle Hidden -ArgumentList $command
Write-Debug "Process finished with return code: $($process.ExitCode)"

# print relevant fds
if (Test-Path $stdoutfile) {Write-Output $(Get-Content $stdoutfile)}
if (Test-Path $stderrfile) {[Console]::Error.WriteLine("$(Get-Content $stderrfile)")}

# exit
exit $($process.ExitCode)
