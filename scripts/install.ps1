param(
  [string]$RepoUrl = "",
  [string]$Branch = "main",
  [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Require-Command "docker"
Require-Command "git"

$targetDir = if ($InstallDir) { $InstallDir } else { (Get-Location).Path }

if ($RepoUrl) {
  $repoName = [System.IO.Path]::GetFileNameWithoutExtension($RepoUrl.TrimEnd('/'))
  if (-not $repoName) {
    $repoName = "remote-terminal"
  }
  $targetDir = Join-Path $targetDir $repoName
  if (-not (Test-Path $targetDir)) {
    git clone --branch $Branch $RepoUrl $targetDir
  } else {
    Write-Host "Repository already exists at $targetDir. Pulling latest changes..."
    Push-Location $targetDir
    git pull --ff-only
    Pop-Location
  }
}

Push-Location $targetDir
try {
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
  }

  New-Item -ItemType Directory -Force "workspace" | Out-Null
  New-Item -ItemType Directory -Force "workspace\.codex" | Out-Null
  New-Item -ItemType Directory -Force "workspace\backups" | Out-Null

  docker compose up -d --build

  $port = (Get-Content ".env" | Where-Object { $_ -match '^PORT=' } | Select-Object -First 1).Split("=")[1]
  if (-not $port) { $port = "8080" }

  Start-Sleep -Seconds 3
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -Method Get -TimeoutSec 10
    Write-Host "Health: $($health.status) at http://localhost:$port"
  } catch {
    Write-Warning "Health check failed. Check logs with: docker compose logs -f"
  }
} finally {
  Pop-Location
}
