# Remote Terminal (Mobile-First)

Self-hosted remote terminal and file manager with password auth, websocket PTY sessions, and mobile-first UI.

## Primary UI
- Main app: `http://localhost:8080/`
- Optional alias: `http://localhost:8080/m`

## What You Get
- Password login with HTTP-only session cookie
- Auth-protected API + websocket terminal
- Multi-session PTY terminal
- File browse/upload/download/delete within workspace
- Project clone/pull/open workflows
- Dockerized deployment with persistent workspace + SQLite

## Quick Start (Windows)
1. Create env:
```powershell
Copy-Item .env.example .env
```
2. Set secure values in `.env`:
```env
APP_PASSWORD=your-strong-password
SESSION_SECRET=replace-with-long-random-secret
AUTH_COOKIE_SECURE=0
```
3. Start:
```powershell
docker compose up -d --build
```
4. Open: `http://localhost:8080/`

## One-Command Install
### Windows
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

### Linux/macOS
```bash
bash ./scripts/install.sh
```

## Public Access via Cloudflare Named Tunnel
1. Route hostname:
```cmd
cloudflared tunnel route dns <TUNNEL_NAME> remote.your-domain.com
```
2. Ensure tunnel ingress:
```yaml
ingress:
  - hostname: remote.your-domain.com
    service: http://localhost:8080
  - service: http_status:404
```
3. Run tunnel:
```cmd
cloudflared tunnel run <TUNNEL_NAME>
```

## Mandatory Security for Public Exposure
- Use strong `APP_PASSWORD` (or `APP_PASSWORD_HASH`)
- Use strong random `SESSION_SECRET`
- Set `AUTH_COOKIE_SECURE=1` under HTTPS
- Keep rate limits enabled
- Do not commit `.env`, workspace data, tunnel credentials

See `SECURITY.md`.

## Operations
Start:
```powershell
docker compose up -d --build
```
Stop:
```powershell
docker compose down
```
Update:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1
```
Backup:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-data.ps1
```

## Troubleshooting
See `docs/TROUBLESHOOTING.md`.

## API/WS
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/files?path=.`
- `POST /api/files/upload?path=.`
- `GET /api/projects`
- `WS /ws/terminal`
