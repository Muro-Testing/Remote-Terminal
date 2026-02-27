# Plan: Codex Auth TLS Reliability in Container

Date: 2026-02-25 13:49

## Goal
Ensure `codex login` token exchange can reach `auth.openai.com` securely from inside Docker.

## Checklist
- [x] Add `ca-certificates` to root Docker runtime image.
- [x] Run `update-ca-certificates` during image build.
- [x] Apply same fix to `backend/Dockerfile` for local backend container workflows.
- [ ] User rebuild and re-test `codex login`.
