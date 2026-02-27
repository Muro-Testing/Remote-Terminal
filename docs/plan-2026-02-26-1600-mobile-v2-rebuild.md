# Mobile v2 Rebuild Plan (Execution Checklist)

Date: 2026-02-26
Task: Rebuild frontend as mobile-first PWA at `/m` while preserving legacy `/`.

## Checklist

- [x] Add backend routing for `/m` and optional `UI_DEFAULT` root behavior.
- [x] Wire `UI_DEFAULT` in config/env/docker-compose.
- [x] Create new mobile app shell and scenes (`Terminal`, `Files`, `Access`, `Settings`).
- [x] Implement terminal core in mobile client (WS, sessions, swipe, keys, quick actions).
- [x] Implement workspace folder picker in terminal scene.
- [x] Implement mobile files scene (browse/upload/download/delete + breadcrumbs).
- [x] Implement access scene (login/logout/session).
- [x] Implement settings scene (theme/font/haptics/reset).
- [x] Add PWA assets (manifest + service worker + install flow).
- [x] Validate build/type checks and run docker rebuild.
- [x] Update README with `/m` usage.
