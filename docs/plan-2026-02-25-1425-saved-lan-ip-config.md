# Plan: Saved LAN IP Configuration

Date: 2026-02-25 14:25

## Goal
Capture host LAN IPv4 at install time and reuse it in app Network Access URLs.

## Checklist
- [x] Add `LOCAL_LAN_IP` variable to `.env.example`.
- [x] Pass `LOCAL_LAN_IP` into container via compose environment.
- [x] Add backend endpoint `GET /api/network/config` to expose configured LAN IP.
- [x] Update frontend Network Access logic to prefer configured LAN IP.
- [x] Add setup script `scripts/setup-lan-ip.ps1` to auto-detect and save LAN IP.
- [x] Update README with setup command flow.
- [ ] User run setup script + restart compose and verify URLs.
