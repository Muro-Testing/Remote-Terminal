# Deployment Runbook

## Primary: PC/Server First
1. Set `.env` values:
   - `APP_PASSWORD`
   - `SESSION_SECRET`
   - `AUTH_COOKIE_SECURE=0` for local HTTP
2. Start:
   - `docker compose up -d --build`
3. Verify:
   - `http://localhost:8080/api/health`
4. Open app:
   - `http://localhost:8080`
5. Login with admin password in Access panel.

## Public HTTPS Access
1. Keep app running on local host port `8080`.
2. Put a tunnel/reverse proxy in front of `http://localhost:8080`.
3. Set:
   - `AUTH_COOKIE_SECURE=1`
4. Restart:
   - `docker compose up -d --build`

## Public Access Options (Free)

### A) Cloudflare Quick Tunnel (no domain)
Command:
- `cloudflared tunnel --url http://localhost:8080`

Pros:
- Fastest setup
- No domain needed

Limits:
- URL is temporary and not stable.

### B) Cloudflare Named Tunnel (with domain)
If you already have a Cloudflare zone/domain, use a named tunnel.

Commands:
1. Route DNS for your tunnel:
   - `cloudflared tunnel route dns <TUNNEL_NAME> remote.<YOUR_DOMAIN>`
2. Run/restart tunnel:
   - `cloudflared tunnel run <TUNNEL_NAME>`

`config.yml` ingress ordering expectations:
- Put remote terminal hostname above fallback.
- Keep fallback last: `service: http_status:404`

Example:
```yaml
ingress:
  - hostname: remote.<YOUR_DOMAIN>
    service: http://localhost:8080
  - service: http_status:404
```

### C) Tailscale Funnel (free-tier fallback)
Commands:
- `tailscale serve http://localhost:8080`
- `tailscale funnel 443 on`

Notes:
- No DNS/domain setup required.
- Requires Tailscale account and client on host machine.

## Known Failure Modes and Fixes
1. Symptom: public domain opens `404` while tunnel is running.
   - Cause: fallback (`http_status:404`) catches request before hostname rule.
   - Fix: move hostname rule above fallback.

2. Symptom: quick tunnel URL fails or changes unexpectedly.
   - Cause: quick tunnels are temporary.
   - Fix: use named tunnel or Tailscale Funnel for more stable access.

3. Symptom: localhost works but public URL fails.
   - Cause: DNS route missing, tunnel not running, or wrong ingress target.
   - Fix:
     - verify route command output
     - confirm tunnel process is running
     - confirm ingress target points to `http://localhost:8080`

## Migration to VPS
1. Copy repository to VPS.
2. Restore backups from `workspace/backups`:
   - SQLite (`app-*.sqlite`)
   - Workspace archive (`workspace-*.zip`/`*.tar.gz`)
3. Set production `.env` values.
4. Start:
   - `docker compose up -d --build`
5. Validate health and login.
