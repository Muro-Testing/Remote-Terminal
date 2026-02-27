$ErrorActionPreference = "Stop"

$containerName = "remote-terminal-mvp"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "workspace\backups"
$dbBackupFile = Join-Path $backupDir "app-$timestamp.sqlite"
$workspaceBackupFile = Join-Path $backupDir "workspace-$timestamp.zip"

New-Item -ItemType Directory -Force $backupDir | Out-Null

docker ps --format "{{.Names}}" | Select-String -SimpleMatch $containerName | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Container $containerName is not running."
}

docker cp "${containerName}:/app/data/app.sqlite" $dbBackupFile
Compress-Archive -Path "workspace\*" -DestinationPath $workspaceBackupFile -Force

Write-Host "Backups created:"
Write-Host " - $dbBackupFile"
Write-Host " - $workspaceBackupFile"
