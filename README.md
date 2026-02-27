# Remote Terminal (Mobile-First)

Self-hosted remote terminal + workspace file manager with secure auth and mobile-first UX.

```text
+----------------------------------------------+
¦ Remote Terminal                             ¦
¦  • Mobile-first UI at /                     ¦
¦  • PTY terminal over WebSocket              ¦
¦  • Multi-session terminal + files/projects  ¦
¦  • Docker or host-PC runtime                ¦
+----------------------------------------------+
```

## Main URL
- `http://localhost:8080/` (primary mobile UI)
- `http://localhost:8080/m` (alias)

## Features
- Password login with HTTP-only session cookie
- Auth-protected REST + WebSocket endpoints
- Multi-session PTY terminal with reconnect/resume
- Files: browse, upload, download, delete, folder ZIP download
- Projects: clone/pull/open under workspace
- Persistent workspace + SQLite when running with Docker volume

## Install Modes

## 1) Docker Mode (recommended)
### One-line install (Windows PowerShell)
```powershell
git clone <YOUR_GITHUB_REPO_URL> && cd .\Remote-Terminal && powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

### One-line install (Linux/macOS)
```bash
git clone <YOUR_GITHUB_REPO_URL> && cd Remote-Terminal && bash ./scripts/install.sh
```

## 2) Host-PC Mode (no Docker)
Requires `Node.js 22+` and `Git`.

### One-line install/run (Windows PowerShell)
```powershell
git clone <YOUR_GITHUB_REPO_URL> && cd .\Remote-Terminal && if (!(Test-Path .env)) { Copy-Item .env.example .env } && New-Item -ItemType Directory -Force workspace,backend\data | Out-Null && cd backend && npm ci && npm run build && node --env-file=../.env dist/server.js
```

### One-line install/run (Linux/macOS)
```bash
git clone <YOUR_GITHUB_REPO_URL> && cd Remote-Terminal && [ -f .env ] || cp .env.example .env && mkdir -p workspace backend/data && cd backend && npm ci && npm run build && node --env-file=../.env dist/server.js
```

## Quick First Run
1. Copy env and set secrets:
```text
APP_PASSWORD=strong-password
SESSION_SECRET=long-random-secret
AUTH_COOKIE_SECURE=0   (set to 1 behind HTTPS)
```
2. Start app (Docker or Host mode).
3. Open `http://localhost:8080/`.
4. Login and test terminal connect.

## Public Access (Free Paths)

### Option A: Cloudflare Quick Tunnel (no domain)
```bash
cloudflared tunnel --url http://localhost:8080
```
- Fastest path.
- URL is temporary and changes between runs.

### Option B: Cloudflare Named Tunnel (with domain)
```bash
cloudflared tunnel route dns <TUNNEL_NAME> remote.<YOUR_DOMAIN>
cloudflared tunnel run <TUNNEL_NAME>
```

Ingress example:
```yaml
ingress:
  - hostname: remote.<YOUR_DOMAIN>
    service: http://localhost:8080
  - service: http_status:404
```

### Option C: Tailscale Funnel (free-tier fallback)
```bash
tailscale serve http://localhost:8080
tailscale funnel 443 on
```
- Useful if you do not want DNS/domain setup.
- Requires Tailscale account and client on host.

## Security Checklist
- Strong `APP_PASSWORD` or `APP_PASSWORD_HASH`
- Strong `SESSION_SECRET`
- `AUTH_COOKIE_SECURE=1` on HTTPS/public access
- Keep rate limits enabled
- Never commit `.env`, workspace data, DB files, or tunnel credentials

See [SECURITY.md](SECURITY.md).

## Useful Commands
```text
# Docker
docker compose up -d --build
docker compose down

# Update
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1

# Backup
powershell -ExecutionPolicy Bypass -File .\scripts\backup-data.ps1
```

## Health/API
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/files?path=.`
- `GET /api/files/download-folder?path=<folder>`
- `WS /ws/terminal`

## Troubleshooting
See [docs/CLEAN_INSTALL_TEST_RUNBOOK.md](docs/CLEAN_INSTALL_TEST_RUNBOOK.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), and [docs/CLOUDFLARE_TUNNEL_SETUP.md](docs/CLOUDFLARE_TUNNEL_SETUP.md).

