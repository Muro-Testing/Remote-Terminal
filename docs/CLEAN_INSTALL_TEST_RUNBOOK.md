# Clean Install Test Runbook

Use this runbook on a fresh machine to verify the app installs, starts, and is reachable from phone.

## Goal
- Install from scratch
- Start successfully
- Login and use terminal/files
- Access from phone over public HTTPS

## Test Profile
- OS: Windows 10/11 (PowerShell examples)
- Network: Home/office Wi-Fi
- Fresh machine: no project files pre-existing

---

## 1) Prerequisites
Install:
- Git
- Docker Desktop
- Cloudflared (for free public URL)

Verify:
```powershell
git --version
docker --version
cloudflared --version
```

Expected: all commands return a version.

---

## 2) Clone and Install (Docker mode)
```powershell
git clone <YOUR_GITHUB_REPO_URL>
cd .\Remote-Terminal
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Expected:
- `.env` created from `.env.example` if missing
- container built and started
- health check success message

---

## 3) Configure Secrets
Open `.env` and set:
```env
APP_PASSWORD=<strong-password>
SESSION_SECRET=<long-random-secret>
AUTH_COOKIE_SECURE=0
```

Restart:
```powershell
docker compose up -d --build
```

---

## 4) Local Functional Check
Health:
```powershell
curl http://localhost:8080/api/health
```

Open app:
- `http://localhost:8080/`

Validate:
1. Login works
2. Terminal `Connect` works
3. Run `pwd` and get output
4. Files tab loads entries
5. Folder ZIP download works

---

## 5) Phone Access (Free, No Domain)
Start quick tunnel:
```powershell
cloudflared tunnel --url http://localhost:8080
```

Copy the generated `https://*.trycloudflare.com` URL and open it on phone.

Set HTTPS cookie mode, then restart:
```env
AUTH_COOKIE_SECURE=1
```
```powershell
docker compose up -d --build
```

Validate on phone:
1. Page opens over HTTPS
2. Login works
3. Terminal connects
4. Command output streams

Note:
- Quick tunnel URL is temporary and may change each run.

---

## 6) Optional Stable Public URL (Named Tunnel + Domain)
Use if you own/manage a domain in Cloudflare.

```powershell
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

Validate:
- `https://remote.<YOUR_DOMAIN>` opens app
- phone login + terminal works

---

## 7) Pass/Fail Checklist
- [ ] Install script completes on clean machine
- [ ] Container starts without errors
- [ ] `/api/health` returns `status: ok`
- [ ] Local login + terminal + files work
- [ ] Phone access works via HTTPS URL
- [ ] WebSocket terminal works on phone

If any item fails, use `docs/TROUBLESHOOTING.md`.

