# Plan: Multi Terminal Sessions

Date: 2026-02-25 13:09

## Goal
Allow opening multiple terminal sessions and switching between them in the same UI.

## Checklist
- [x] Upgrade terminal websocket protocol to support multiple session IDs.
- [x] Implement create/switch/close/list session operations on backend.
- [x] Tag terminal output/status events by `sessionId`.
- [x] Add frontend session controls (`New Session`, `Close Session`, tabs).
- [x] Add per-session output buffering and active-session rendering.
- [x] Validate check/build and run websocket smoke test.

## Validation Notes
- `npm run check` passed.
- `npm run build` passed.
- Websocket smoke test confirmed:
  - two sessions created
  - separate outputs (`echo one`, `echo two`)
  - active session tracking and session list updates
