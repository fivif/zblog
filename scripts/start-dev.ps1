[CmdletBinding()]
param(
  [int]$ApiPort = 8000,
  [int]$PublicPort = 3000,
  [int]$AdminPort = 5173,
  [switch]$Check
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path

function Quote-ForPowerShell([string]$Value) {
  return "'" + ($Value -replace "'", "''") + "'"
}

function Require-File([string]$Path, [string]$Message) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw $Message
  }
}

function Resolve-Tool([string[]]$Names, [string]$InstallHint) {
  foreach ($Name in $Names) {
    $Command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($Command) {
      return $Command.Source
    }
  }
  throw $InstallHint
}

function Get-ListeningProcessIds([int]$Port) {
  $Matches = @()
  $Lines = & netstat -ano | Select-String ":$Port\s"
  foreach ($Line in $Lines) {
    $Parts = ($Line.ToString().Trim() -split "\s+")
    if ($Parts.Length -ge 5 -and $Parts[3] -eq "LISTENING") {
      $Matches += [int]$Parts[4]
    }
  }
  return $Matches | Select-Object -Unique
}

function Assert-PortAvailable([string]$ServiceName, [int]$Port) {
  $ProcessIds = @(Get-ListeningProcessIds $Port)
  if ($ProcessIds.Count -eq 0) {
    return
  }

  $Owners = $ProcessIds | ForEach-Object {
    $ProcessIdValue = $_
    $Process = Get-Process -Id $ProcessIdValue -ErrorAction SilentlyContinue
    if ($Process) {
      "$ProcessIdValue/$($Process.ProcessName)"
    } else {
      "$ProcessIdValue/unknown"
    }
  }

  throw "$ServiceName port $Port is already in use by: $($Owners -join ', '). Close the old dev window/process or choose another port, e.g. .\scripts\start-dev.ps1 -ApiPort 8010 -PublicPort 3010 -AdminPort 5180"
}

function New-ServiceCommand([string]$Title, [string]$Body) {
  @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location -LiteralPath $(Quote-ForPowerShell $Root)
Write-Host ''
Write-Host '== $Title ==' -ForegroundColor Cyan
Write-Host 'Root: $Root'
Write-Host ''
$Body
"@
}

function ConvertTo-EncodedCommand([string]$Command) {
  return [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
}

function Start-ServiceWindow([string]$Command) {
  $EncodedCommand = ConvertTo-EncodedCommand $Command
  return Start-Process -FilePath $PowerShellExe -ArgumentList ($BaseArgs + @($EncodedCommand)) -PassThru
}

Write-Host "Blog dev launcher" -ForegroundColor Cyan
Write-Host "Root: $Root"

$Python = Join-Path $Root "venv\Scripts\python.exe"
$Node = Resolve-Tool @("node.exe", "node") "node not found. Install Node.js and ensure node is in PATH."
$PowerShellExe = (Get-Command powershell.exe -ErrorAction Stop).Source

Require-File $Python "Python venv not found: $Python. Create venv and install apps/api dependencies first."

$EnvFile = Join-Path $Root ".env"
$EnvExample = Join-Path $Root ".env.example"
if (-not (Test-Path -LiteralPath $EnvFile)) {
  Require-File $EnvExample ".env missing and .env.example not found."
  Copy-Item -LiteralPath $EnvExample -Destination $EnvFile
  Write-Host "Created .env from .env.example" -ForegroundColor Yellow
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root "content\articles") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root "content\media") | Out-Null

$NextDirectScript = Join-Path $Root "scripts\start-next-direct.cjs"
$ViteBin = Join-Path $Root "apps\web-admin\node_modules\vite\bin\vite.js"
$AdminDir = Join-Path $Root "apps\web-admin"
Require-File $NextDirectScript "Next direct launcher not found: $NextDirectScript"
Require-File $ViteBin "Vite launcher not found: $ViteBin. Run pnpm install first."

Assert-PortAvailable "API" $ApiPort
Assert-PortAvailable "Public" $PublicPort
Assert-PortAvailable "Admin" $AdminPort

$QuotedPython = Quote-ForPowerShell $Python
$QuotedNode = Quote-ForPowerShell $Node
$QuotedNextDirectScript = Quote-ForPowerShell $NextDirectScript
$QuotedViteBin = Quote-ForPowerShell $ViteBin
$QuotedAdminDir = Quote-ForPowerShell $AdminDir

$ApiCommand = New-ServiceCommand "Blog API :$ApiPort" @"
`$env:PYTHONPATH = 'apps/api'
& $QuotedPython -m uvicorn blog_api.main:app --app-dir apps/api --host localhost --port $ApiPort
"@

$PublicCommand = New-ServiceCommand "Blog Public :$PublicPort" @"
`$env:PORT = '$PublicPort'
`$env:HOST = 'localhost'
& $QuotedNode $QuotedNextDirectScript $PublicPort
"@

$AdminCommand = New-ServiceCommand "Blog Admin :$AdminPort" @"
Set-Location -LiteralPath $QuotedAdminDir
& $QuotedNode $QuotedViteBin --host localhost --port $AdminPort --configLoader native
"@

Write-Host "API:    http://localhost:$ApiPort"
Write-Host "Public: http://localhost:$PublicPort"
Write-Host "Admin:  http://localhost:$AdminPort"

if ($Check) {
  Write-Host "Check passed. Use .\start-dev.bat or .\scripts\start-dev.ps1 to launch services." -ForegroundColor Green
  exit 0
}

$BaseArgs = @("-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand")

$ApiProcess = Start-ServiceWindow $ApiCommand
Start-Sleep -Milliseconds 350
$PublicProcess = Start-ServiceWindow $PublicCommand
Start-Sleep -Milliseconds 350
$AdminProcess = Start-ServiceWindow $AdminCommand

$PidFile = Join-Path $Root ".tmp-started-pids.txt"
@($ApiProcess.Id, $PublicProcess.Id, $AdminProcess.Id) | Set-Content -LiteralPath $PidFile -Encoding ascii

Write-Host "Started 3 service windows." -ForegroundColor Green
Write-Host ("Window PIDs: API={0}, Public={1}, Admin={2}" -f $ApiProcess.Id, $PublicProcess.Id, $AdminProcess.Id)
Write-Host "PID file: $PidFile"
Write-Host "Close those windows, or press Ctrl+C inside each window to stop services."
