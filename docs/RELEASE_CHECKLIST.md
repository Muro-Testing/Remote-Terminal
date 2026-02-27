# Release Checklist

## Security
- [ ] `.env` is not committed
- [ ] `APP_PASSWORD` is strong
- [ ] `SESSION_SECRET` is long random
- [ ] `AUTH_COOKIE_SECURE=1` for public HTTPS
- [ ] cloudflared credentials are not in repo

## App Validation
- [ ] `docker compose up -d --build` succeeds
- [ ] `/api/health` returns `ok`
- [ ] `/` opens mobile UI
- [ ] login/logout/session works
- [ ] terminal connect + session switch works without mixed output
- [ ] files browse/upload/download/delete works

## Docs
- [ ] README quick start works on clean machine
- [ ] Cloudflare runbook commands verified
- [ ] Troubleshooting doc covers top failures

## Publish
- [ ] LICENSE included
- [ ] SECURITY.md included
- [ ] CONTRIBUTING.md included
