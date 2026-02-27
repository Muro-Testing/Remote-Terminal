# Troubleshooting

## App Not Reachable
1. Check container:
```powershell
docker compose ps
```
2. Rebuild and start:
```powershell
docker compose up -d --build
```
3. Check health:
```powershell
curl http://localhost:8080/api/health
```

## Mobile UI Shows Old Version
1. Open browser URL directly: `http://localhost:8080/`
2. Clear site data for the app domain.
3. If installed as PWA, remove and reinstall.

## Login Works But Files/Folders Missing
1. Verify auth state in Access scene.
2. Press `Refresh` in Files scene.
3. Verify API response locally:
```powershell
curl http://localhost:8080/api/files?path=.
```
4. If unauthorized, login again and retry.

## Terminal Session Output Looks Wrong
1. Reconnect terminal from Terminal scene.
2. Open Sessions sheet and switch session once.
3. Each session should display only its own buffer.

## Cloudflare 404
Ensure tunnel ingress has app hostname above fallback:
```yaml
ingress:
  - hostname: remote.example.com
    service: http://localhost:8080
  - service: http_status:404
```
