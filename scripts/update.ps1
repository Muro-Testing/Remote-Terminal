$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  throw ".env not found. Run scripts/install.ps1 first."
}

if (Test-Path ".git") {
  git pull --ff-only
} else {
  Write-Warning "No .git directory found. Skipping git pull."
}

docker compose up -d --build

$port = (Get-Content ".env" | Where-Object { $_ -match '^PORT=' } | Select-Object -First 1).Split("=")[1]
if (-not $port) { $port = "8080" }

Start-Sleep -Seconds 2
try {
  $health = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -Method Get -TimeoutSec 10
  Write-Host "Update complete. Health: $($health.status)"
} catch {
  Write-Warning "Health check failed. Check logs with: docker compose logs -f"
}
