<#
.SYNOPSIS
  Installs everything needed to build and run plen-motion-editor-new-look on Windows.

.DESCRIPTION
  Run it from this repository's folder in PowerShell:

    powershell -ExecutionPolicy Bypass -File .\setup.ps1             # asks before each install
    powershell -ExecutionPolicy Bypass -File .\setup.ps1 -CheckOnly  # only reports what is missing
    powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Yes        # installs required items without asking
    powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Yes -All   # also installs optional items

  Uses winget (built into Windows 10/11) for apps and arduino-cli for Arduino
  board packages and libraries. Safe to run again: anything already installed
  is skipped. Nothing outside the listed tools is changed.
#>
[CmdletBinding()]
param([switch]$CheckOnly, [switch]$Yes, [switch]$All)

$ErrorActionPreference = 'Continue'   # native tools write progress to stderr; keep going
$ProgressPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ESP32_URL = 'https://espressif.github.io/arduino-esp32/package_esp32_index.json'

# ===================== What this repository needs =====================
$Apps = @(
    @{ Name = 'Arduino IDE 2'; Id = 'ArduinoSA.IDE.stable'; Command = $null; Optional = $false; Paths = @("$env:ProgramFiles\Arduino IDE\Arduino IDE.exe", "$env:LOCALAPPDATA\Programs\Arduino IDE\Arduino IDE.exe") }
)
$Cores = @(
    @{ Id = 'arduino:avr'; Name = 'Arduino AVR boards' },
    @{ Id = 'esp32:esp32'; Name = 'ESP32 (Espressif)' }
)
$Libraries = @()
$NeedPython = $true
$PythonMin = '3.9'
$PythonMax = $null
$PythonEnvs = @(
    @{ Path = 'control-server\control_server'; Requirements = 'requirements.txt'; Imports = @('bottle', 'gevent', 'geventwebsocket', 'serial') }
)
$NodeProjects = @()
$Manual = @()
# ======================================================================

$script:Missing = New-Object System.Collections.Generic.List[string]

function Say($msg, $color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Ok($what)      { Say "  [ok]      $what" 'Green' }
function Miss($what)    { Say "  [missing] $what" 'Yellow'; $script:Missing.Add($what) }

function Want($what, [bool]$optional) {
    if ($CheckOnly) { return $false }
    if ($Yes) { return (-not $optional) -or $All }
    $hint = if ($optional) { '[y/N]' } else { '[Y/n]' }
    $a = Read-Host "  Install $what? $hint"
    if ($a -eq '') { return -not $optional }
    return $a -match '^(y|yes)$'
}

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Test-Winget($id) {
    $null = winget list --id $id -e --accept-source-agreements 2>$null
    return $LASTEXITCODE -eq 0
}

function Ensure-App($app) {
    $present = $false
    if ($app.Command) { $present = [bool](Get-Command $app.Command -ErrorAction SilentlyContinue) }
    if (-not $present -and $app.Paths) { foreach ($pp in $app.Paths) { if ($pp -and (Test-Path -LiteralPath $pp)) { $present = $true } } }
    if (-not $present) { $present = Test-Winget $app.Id }
    if ($present) { Ok $app.Name; return }
    $label = $app.Name; if ($app.Optional) { $label += ' (optional: ' + $app.Why + ')' }
    Miss $label
    if (Want $app.Name ([bool]$app.Optional)) {
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { Say '  winget is not available. Install "App Installer" from the Microsoft Store, then run this again.' 'Red'; return }
        winget install --id $app.Id -e --accept-package-agreements --accept-source-agreements
        Refresh-Path
    }
}

function Get-ArduinoCli {
    $c = Get-Command arduino-cli -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    foreach ($p in @("$env:ProgramFiles\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe",
                     "$env:LOCALAPPDATA\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe")) {
        if (Test-Path -LiteralPath $p) { return $p }
    }
    return $null
}

function Ensure-Arduino {
    if (-not $Cores -and -not $Libraries) { return }
    $cli = Get-ArduinoCli
    if (-not $cli) {
        Miss 'arduino-cli (installs boards and libraries)'
        if (Want 'Arduino CLI' $false) { winget install --id ArduinoSA.CLI -e --accept-package-agreements --accept-source-agreements; Refresh-Path; $cli = Get-ArduinoCli }
        if (-not $cli) { Say '  Skipping Arduino boards and libraries (no arduino-cli).' 'Yellow'; return }
    } else { Ok "arduino-cli ($cli)" }

    $urlArgs = @()
    if ($Cores | Where-Object { $_.Id -like 'esp32:*' }) { $urlArgs = @('--additional-urls', $ESP32_URL) }
    $installedCores = @()
    try {
        $j = & $cli core list --format json @urlArgs 2>$null | ConvertFrom-Json
        $list = if ($j.platforms) { $j.platforms } else { $j }
        $installedCores = @($list | ForEach-Object { if ($_.id) { $_.id } elseif ($_.ID) { $_.ID } })
    } catch { }
    $indexUpdated = $false
    foreach ($core in $Cores) {
        if ($installedCores -contains $core.Id) { Ok "Arduino boards: $($core.Name) ($($core.Id))"; continue }
        Miss "Arduino boards: $($core.Name) ($($core.Id))"
        if (Want "board package $($core.Id)" $false) {
            if (-not $indexUpdated) { & $cli core update-index @urlArgs; $indexUpdated = $true }
            & $cli core install $core.Id @urlArgs
        }
    }

    $installedLibs = @()
    try {
        $j = & $cli lib list --all --format json 2>$null | ConvertFrom-Json
        $list = if ($j.installed_libraries) { $j.installed_libraries } else { $j }
        $installedLibs = @($list | ForEach-Object { $_.library.name })
    } catch { }
    foreach ($lib in $Libraries) {
        if ($installedLibs -contains $lib) { Ok "Arduino library: $lib"; continue }
        Miss "Arduino library: $lib"
        if (Want "library '$lib'" $false) { & $cli lib install $lib }
    }
    if (($Cores | Where-Object { $_.Id -like 'esp32:*' })) {
        Say "  Tip: in Arduino IDE, add this under File > Preferences > Additional boards manager URLs so the ESP32 boards stay updatable:" 'DarkGray'
        Say "       $ESP32_URL" 'DarkGray'
    }
}

function Find-Python([version]$min, $max) {
    $cands = @()
    if (Get-Command py -ErrorAction SilentlyContinue) {
        foreach ($v in '3.12', '3.11', '3.13', '3.10', '3.9', '3') { $cands += ,@('py', "-$v") }
    }
    if (Get-Command python -ErrorAction SilentlyContinue) { $cands += ,@('python') }
    foreach ($c in $cands) {
        try {
            $exe = $c[0]; $rest = @(); if ($c.Count -gt 1) { $rest = $c[1..($c.Count - 1)] }
            $out = & $exe @rest -c "import sys; print('%d.%d.%d' % sys.version_info[:3])" 2>$null
            if ($LASTEXITCODE -eq 0 -and $out -and ([version]$out -ge $min) -and (-not $max -or [version]$out -lt [version]$max)) { return ,$c }
        } catch { }
    }
    return $null
}

function Ensure-Python {
    if (-not $NeedPython -and -not $PythonEnvs) { return }
    $min = [version]$PythonMin
    $py = Find-Python $min $PythonMax
    $range = "Python $min or newer"; if ($PythonMax) { $range = "Python $min up to (not including) $PythonMax" }
    if ($py) { Ok "$range ($($py -join ' '))" }
    else {
        Miss $range
        if (Want 'Python 3.12' $false) { winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements; Refresh-Path; $py = Find-Python $min $PythonMax }
    }
    foreach ($envDef in $PythonEnvs) {
        $dir = Join-Path $Root $envDef.Path
        $venvPy = Join-Path $dir '.venv\Scripts\python.exe'
        $label = "Python packages for $($envDef.Path) (private .venv)"
        if (Test-Path -LiteralPath $venvPy) {
            $mods = ($envDef.Imports -join ', ')
            & $venvPy -c "import $mods" 2>$null
            if ($LASTEXITCODE -eq 0) { Ok $label; continue }
        }
        Miss $label
        if (-not $py) { Say '  Needs Python first.' 'Yellow'; continue }
        if (Want $label $false) {
            $exe = $py[0]; $rest = @(); if ($py.Count -gt 1) { $rest = $py[1..($py.Count - 1)] }
            if (-not (Test-Path -LiteralPath $venvPy)) { & $exe @rest -m venv (Join-Path $dir '.venv') }
            & $venvPy -m pip install --upgrade pip
            & $venvPy -m pip install -r (Join-Path $dir $envDef.Requirements)
        }
    }
}

function Ensure-Node {
    foreach ($n in $NodeProjects) {
        $dir = Join-Path $Root $n
        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Miss "npm packages for $n (needs Node.js)"; continue }
        if (Test-Path -LiteralPath (Join-Path $dir 'node_modules')) { Ok "npm packages for $n"; continue }
        Miss "npm packages for $n"
        if (Want "npm packages for $n" $false) { Push-Location -LiteralPath $dir; try { npm install } finally { Pop-Location } }
    }
}

function Show-Manual {
    foreach ($m in $Manual) {
        $found = $false
        foreach ($p in $m.Paths) { if ($p -and (Test-Path -LiteralPath $p)) { $found = $true } }
        if (-not $found -and $m.Command) { $found = [bool](Get-Command $m.Command -ErrorAction SilentlyContinue) }
        if ($found) { Ok $m.Name; continue }
        Miss "$($m.Name) (manual install)"
        Say "    $($m.Note)" 'Yellow'
        Say "    Download: $($m.Url)" 'Yellow'
    }
}

Say "Setting up plen-motion-editor-new-look" 'Cyan'
if ($CheckOnly) { Say '(check only: nothing will be installed)' 'DarkGray' }
Say ''
Say 'Apps' 'Cyan';                  foreach ($a in $Apps) { Ensure-App $a }
if ($Cores -or $Libraries) { Say ''; Say 'Arduino boards and libraries' 'Cyan'; Ensure-Arduino }
if ($NeedPython -or $PythonEnvs) { Say ''; Say 'Python' 'Cyan'; Ensure-Python }
if ($NodeProjects) { Say ''; Say 'Node.js packages' 'Cyan'; Ensure-Node }
if ($Manual) { Say ''; Say 'Installed separately' 'Cyan'; Show-Manual }
Say ''
if ($script:Missing.Count -eq 0) { Say 'Everything is installed.' 'Green' }
elseif ($CheckOnly) { Say "$($script:Missing.Count) item(s) missing. Run without -CheckOnly to install them." 'Yellow' }
else { Say 'Done. Run with -CheckOnly to confirm everything is in place.' 'Green' }
Say ''
Say 'Next steps' 'Cyan'
Say '  Read the hardware warning in README.md first: this needs the modified PLEN 1.4.'
Say '  1. Firmware: open firmware\updated_firmware\updated_firmware.ino, board: Arduino Micro, Upload.'
Say '  2. Head board: open head-board\ESP32_MAX3485\ESP32_MAX3485.ino, board: ESP32C3 Dev Module, Upload.'
Say '  3. Calibration page: double-click control-server\control_server\launch.bat (http://localhost:17264/).'
Say '  4. Motion editor: double-click anim8\launch.bat (http://localhost:8000), use Chrome or Edge.'
