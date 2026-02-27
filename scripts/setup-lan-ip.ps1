$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"

if (!(Test-Path $envPath)) {
  Copy-Item -Path $envExamplePath -Destination $envPath
}

$candidateIps = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
  } |
  Sort-Object -Property SkipAsSource, InterfaceMetric

if (-not $candidateIps -or $candidateIps.Count -eq 0) {
  Write-Error "Could not detect a LAN IPv4 address."
  exit 1
}

$selectedIp = $candidateIps[0].IPAddress
$envContent = Get-Content -Path $envPath
$found = $false
$updated = New-Object System.Collections.Generic.List[string]

foreach ($line in $envContent) {
  if ($line -match "^LOCAL_LAN_IP=") {
    $updated.Add("LOCAL_LAN_IP=$selectedIp")
    $found = $true
  } else {
    $updated.Add($line)
  }
}

if (-not $found) {
  $updated.Add("LOCAL_LAN_IP=$selectedIp")
}

Set-Content -Path $envPath -Value $updated
Write-Output "LOCAL_LAN_IP set to $selectedIp in .env"
