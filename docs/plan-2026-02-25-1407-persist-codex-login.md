# Plan: Persist Codex Login

Date: 2026-02-25 14:07

## Goal
Keep Codex subscription login state after Docker container rebuild/restart.

## Checklist
- [x] Add host-mounted Codex auth volume to compose.
- [x] Verify compose file contains `./workspace/.codex:/home/app/.codex`.
- [ ] User restart containers and verify login persistence.
