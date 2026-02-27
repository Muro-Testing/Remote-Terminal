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
1. Keep app bound to local host port `8080`.
2. Put a tunnel/reverse proxy in front of `http://localhost:8080`.
3. Set:
   - `AUTH_COOKIE_SECURE=1`
4. Restart:
   - `docker compose up -d --build`

### Expose Remote Terminal on Existing Cloudflare Tunnel
If you already have a named tunnel (for example used by n8n), add this app as another hostname on the same tunnel.

Commands used:
1. Add DNS route for the existing tunnel:
   - `cloudflared tunnel route dns <TUNNEL_NAME> remote.example.com`
2. Run/restart named tunnel:
   - `cloudflared tunnel run <TUNNEL_NAME>`

`config.yml` ingress ordering expectations:
- Add hostname route for remote terminal above fallback.
- Keep fallback last:
  - `service: http_status:404`

Example:
```yaml
ingress:
  - hostname: n8n.example.com
    service: http://localhost:5678
  - hostname: remote.example.com
    service: http://localhost:8080
  - service: http_status:404
```

This serves both n8n and remote terminal through the same tunnel with different hostnames.

### Known Failure Modes and Fixes
1. Symptom: `remote.example.com` opens `404` even when tunnel is running.
   - Cause: ingress fallback (`http_status:404`) catches request before hostname rule.
   - Fix: move `hostname: remote.example.com` rule above fallback.

2. Symptom: quick tunnel (`*.trycloudflare.com`) fails or changes unexpectedly.
   - Cause: quick tunnels are temporary and can conflict with existing config expectations.
   - Fix: use named tunnel + DNS route (`cloudflared tunnel route dns ...`).

3. Symptom: localhost works but public domain fails.
   - Cause: DNS route missing or named tunnel not running with correct config.
   - Fix:
     - verify route command output
     - confirm tunnel process is running
     - confirm ingress block contains correct hostname -> `http://localhost:8080`

## Migration to VPS
1. Copy repository to VPS.
2. Restore backups from `workspace/backups`:
   - SQLite (`app-*.sqlite`)
   - Workspace archive (`workspace-*.zip`/`*.tar.gz`)
3. Set production `.env` values.
4. Start:
   - `docker compose up -d --build`
5. Validate health and login.
