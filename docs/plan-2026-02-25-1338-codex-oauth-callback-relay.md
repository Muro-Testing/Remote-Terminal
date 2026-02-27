# Plan: Codex OAuth Callback Relay

Date: 2026-02-25 13:38

## Goal
Make subscription login practical for all users in Docker by relaying localhost OAuth callback URLs from UI to container-local auth listener.

## Checklist
- [x] Add backend endpoint to relay `localhost:1455/auth/callback` URL to `127.0.0.1:1455`.
- [x] Add frontend "Codex Login Helper" input and action button.
- [x] Validate allowed callback host/port/path for safety.
- [x] Return relay result status to UI.
- [x] Run type/build validation.

## Validation Notes
- `npm run check` passed.
- `npm run build` passed.
