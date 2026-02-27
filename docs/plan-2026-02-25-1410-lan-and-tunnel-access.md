# Plan: LAN + Internet Access Enablement

Date: 2026-02-25 14:10

## Goal
Make the Remote Terminal app reachable from devices on the same Wi-Fi now and define a secure path for internet exposure.

## Checklist
- [x] Update compose port bindings to listen on all interfaces for `8080`, `1455`, and `8000`.
- [x] Keep current app container architecture unchanged.
- [ ] User restart compose and verify LAN access from phone.
- [ ] Optional: add tunnel (ngrok/Cloudflare) for internet exposure with authentication.
