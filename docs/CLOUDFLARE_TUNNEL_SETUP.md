# Cloudflare Named Tunnel Setup (Custom Domain)

This guide documents the exact working setup for exposing the remote terminal app at:
- `remote.example.com`

Using existing named tunnel:
- `<TUNNEL_NAME>`

## 1. Confirm Local App Health
Run from project root:
```powershell
curl http://localhost:8080/api/health
```
Expected: JSON with `"status":"ok"`.

## 2. Add DNS Route Command
Run:
```cmd
cloudflared tunnel route dns <TUNNEL_NAME> remote.example.com
```
Expected output includes:
- `Added CNAME remote.example.com ...`

## 3. Update Ingress Block
Ensure your named tunnel config (`%USERPROFILE%\.cloudflared\config.yml`) contains:
```yaml
ingress:
  - hostname: n8n.example.com
    service: http://localhost:5678
  - hostname: remote.example.com
    service: http://localhost:8080
  - service: http_status:404
```

Important:
- Keep the `remote.example.com` rule above fallback.
- Keep fallback (`http_status:404`) as the last ingress rule.

## 4. Run Tunnel
Run/restart:
```cmd
cloudflared tunnel run <TUNNEL_NAME>
```
Keep this process running.

## 5. Validate Public Hostname
Open:
- `https://remote.example.com`

Validation checklist:
1. App loads
2. Login works
3. Terminal websocket connects
4. Existing `n8n.example.com` still works

## 6. Security Hardening Checklist
In `.env`:
```env
AUTH_COOKIE_SECURE=1
APP_PASSWORD=<strong password>
SESSION_SECRET=<long random value>
```
Then restart:
```powershell
docker compose up -d --build
```

## 7. Troubleshooting Decision Tree
### A) Public domain returns 404
- Check ingress rule order.
- `remote.example.com` must be above `http_status:404`.

### B) Localhost works, domain does not
- Re-run DNS route command:
  - `cloudflared tunnel route dns <TUNNEL_NAME> remote.example.com`
- Ensure named tunnel process is running:
  - `cloudflared tunnel run <TUNNEL_NAME>`

### C) Using quick tunnel URL and it is unstable
- Quick tunnels are temporary.
- Use named tunnel + custom DNS route (this guide).

### D) Domain loads but login/session issues
- Verify:
  - `AUTH_COOKIE_SECURE=1`
  - app is accessed over HTTPS
  - correct `APP_PASSWORD`
