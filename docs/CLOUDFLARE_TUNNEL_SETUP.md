# Cloudflare Tunnel Setup (Generic)

This guide explains both Cloudflare tunnel modes:
- Quick Tunnel (no domain)
- Named Tunnel (custom domain)

## 1. Confirm Local App Health
Run from project root:
```powershell
curl http://localhost:8080/api/health
```
Expected: JSON with `"status":"ok"`.

## 2. Option A: Quick Tunnel (No Domain)
Run:
```cmd
cloudflared tunnel --url http://localhost:8080
```

What to expect:
- A temporary `https://*.trycloudflare.com` URL.
- Good for immediate testing from phone/laptop.

Limitations:
- URL is temporary and can change each run.
- No stability guarantees.

## 3. Option B: Named Tunnel + Custom Domain
Prerequisites:
- Cloudflare account and zone/domain configured.
- Existing or newly created named tunnel.

### 3.1 Route DNS
```cmd
cloudflared tunnel route dns <TUNNEL_NAME> remote.<YOUR_DOMAIN>
```

### 3.2 Configure ingress
In `%USERPROFILE%\.cloudflared\config.yml`:
```yaml
ingress:
  - hostname: remote.<YOUR_DOMAIN>
    service: http://localhost:8080
  - service: http_status:404
```

Important:
- Hostname rule must be above fallback.
- Fallback must remain last.

### 3.3 Run tunnel
```cmd
cloudflared tunnel run <TUNNEL_NAME>
```

### 3.4 Validate public hostname
Open:
- `https://remote.<YOUR_DOMAIN>`

Validation checklist:
1. App loads
2. Login works
3. Terminal websocket connects

## 4. Security Hardening Checklist
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

## 5. Troubleshooting Decision Tree
### A) Public hostname returns 404
- Check ingress rule order.
- Hostname rule must be above `http_status:404`.

### B) Localhost works, public hostname does not
- Re-run DNS route command.
- Ensure tunnel process is running.
- Confirm ingress points to `http://localhost:8080`.

### C) Quick tunnel URL unstable
- Expected behavior for quick tunnel.
- Switch to named tunnel for stable URL.

### D) Domain loads but login/session fails
- Verify:
  - `AUTH_COOKIE_SECURE=1`
  - app is accessed over HTTPS
  - correct `APP_PASSWORD`
