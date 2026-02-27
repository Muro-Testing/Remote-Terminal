# Security Policy

## Scope
This project exposes a remote shell and file operations. Treat it as a high-risk self-hosted service.

## Mandatory Baseline Before Public Exposure
1. Use strong credentials:
   - `APP_PASSWORD` (or `APP_PASSWORD_HASH`)
   - `SESSION_SECRET` (long random value)
2. Use HTTPS for internet access and set:
   - `AUTH_COOKIE_SECURE=1`
3. Keep rate limits enabled:
   - `LOGIN_RATE_LIMIT_PER_MIN`
   - `WS_CONNECT_RATE_LIMIT_PER_MIN`
4. Expose only one public endpoint (no unnecessary open ports).
5. Do not commit secrets:
   - `.env`
   - cloudflared credentials
   - database dumps and workspace archives

## Recommended Extra Protection
1. Put Cloudflare Access or another identity gate in front of the app.
2. Rotate credentials after sharing demos.
3. Keep host OS and Docker up to date.
4. Run with minimal privileges and isolate host-sensitive files.

## Reporting Security Issues
Do not open public issues for vulnerabilities. Report privately to the project maintainer first.
