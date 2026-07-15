#Requires -Version 5.1
# Continue: docker compose writes progress to stderr; Stop would abort mid-run.
$ErrorActionPreference = 'Continue'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

$sqlFile = Join-Path $PSScriptRoot 'demo_seed.sql'
if (-not (Test-Path $sqlFile)) {
    throw "Missing $sqlFile"
}

Write-Host 'Stopping app/nginx to reduce DB lock contention (optional)...' -ForegroundColor Cyan
docker compose stop app nginx | Out-Null

Write-Host 'Running demo seed against postgres-db...' -ForegroundColor Cyan
Get-Content $sqlFile -Raw -Encoding utf8 | docker exec -i postgres-db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
if ($LASTEXITCODE -ne 0) {
    throw "demo_seed.sql failed (exit $LASTEXITCODE)"
}

Write-Host 'Starting app/nginx...' -ForegroundColor Cyan
docker compose start app nginx | Out-Null

Write-Host ''
Write-Host 'Demo seed complete.' -ForegroundColor Green
Write-Host '  Preserved: existing admins (e.g. Google login)'
Write-Host '  Admin:    admin@example.com / Admin@123'
Write-Host '  Tutors:   tutor1-demo@tms.local .. tutor5-demo@tms.local / Demo@123'
Write-Host '  Students: student1-demo@tms.local .. student12-demo@tms.local / Demo@123'
Write-Host 'See scripts/seed/README.md for edge-case map.'
