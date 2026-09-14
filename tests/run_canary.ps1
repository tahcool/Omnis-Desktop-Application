<#
.SYNOPSIS
    Omnis 4.3.10 Canary Test Launcher (Windows PowerShell 5.1 compatible)

.DESCRIPTION
    Prompts for two passwords with hidden input:
      Admin A (takunda@) - demotion/re-promotion via admin-operations
      Email-test user (rutendo@) - email INSERT/cancel via RLS + email-submit

    Admin B (gh05t@) is the demotion target only. Not authenticated.

    Credentials are set as process-scoped env vars and cleared in finally.
    Never includes passwords in command text, logs, or saved files.

.USAGE
    powershell -ExecutionPolicy Bypass -File tests\run_canary.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -- Load .env --
$envFile = Join-Path -Path (Split-Path -Parent $PSScriptRoot) -ChildPath ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "Cannot find .env at $envFile"
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $parts = $line -split '=', 2
        [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
}

if (-not $env:SUPABASE_URL) { Write-Error "SUPABASE_URL not found in .env"; exit 1 }
if (-not $env:SUPABASE_ANON_KEY) { Write-Error "SUPABASE_ANON_KEY not found in .env"; exit 1 }

Write-Host ""
Write-Host "=== Omnis 4.3.10 Canary Test Launcher ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script performs approved bounded canary operations."
Write-Host "Passwords are prompted securely and cleared after the test."
Write-Host ""
Write-Host "Admin A:          takunda@industrial-exchange.group (demotion/re-promotion)"
Write-Host "Admin B (target): gh05t@omnis.local (no password needed)"
Write-Host "Email-test user:  rutendo@industrial-exchange.group (INSERT/cancel)"
Write-Host ""

# -- Prompt for passwords (hidden input, PS 5.1 compatible) --

function ConvertFrom-SecureStringCompat {
    param([System.Security.SecureString]$SecureStr)
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureStr)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$secA = Read-Host "Enter password for takunda@industrial-exchange.group" -AsSecureString
$secE = Read-Host "Enter password for rutendo@industrial-exchange.group" -AsSecureString

$plainA = ConvertFrom-SecureStringCompat $secA
$plainE = ConvertFrom-SecureStringCompat $secE

if ([string]::IsNullOrWhiteSpace($plainA)) {
    Write-Error "Admin A password cannot be empty."
    exit 1
}
if ([string]::IsNullOrWhiteSpace($plainE)) {
    Write-Error "Email-test user password cannot be empty."
    exit 1
}

try {
    [Environment]::SetEnvironmentVariable('CANARY_ADMIN_A_PASSWORD', $plainA, 'Process')
    [Environment]::SetEnvironmentVariable('CANARY_EMAIL_USER_PASSWORD', $plainE, 'Process')

    $plainA = $null
    $plainE = $null
    [GC]::Collect()

    Write-Host ""
    Write-Host "Credentials set. Running canary test..." -ForegroundColor Yellow
    Write-Host ""

    $testScript = Join-Path $PSScriptRoot "test_canary.js"
    if (-not (Test-Path $testScript)) {
        Write-Error "Cannot find test_canary.js at $testScript"
        exit 1
    }

    $projectRoot = Split-Path -Parent $PSScriptRoot
    $nodeModules = Join-Path -Path $projectRoot -ChildPath "node_modules\@supabase\supabase-js"
    if (-not (Test-Path $nodeModules)) {
        Write-Error "@supabase/supabase-js not found. Run 'npm install' in the project root."
        exit 1
    }

    $exitCode = 0
    & node $testScript
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "Canary test PASSED." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Canary test FAILED (exit code $exitCode)." -ForegroundColor Red
    }

    exit $exitCode
}
finally {
    [Environment]::SetEnvironmentVariable('CANARY_ADMIN_A_PASSWORD', $null, 'Process')
    [Environment]::SetEnvironmentVariable('CANARY_EMAIL_USER_PASSWORD', $null, 'Process')
    $plainA = $null
    $plainE = $null
}