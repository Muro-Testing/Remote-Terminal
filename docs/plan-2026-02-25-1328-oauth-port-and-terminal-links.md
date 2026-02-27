# Plan: OAuth Callback Port + Clickable Terminal Links

Date: 2026-02-25 13:28

## Goal
Enable subscription login callback reachability from host browser and make terminal URLs open on normal click/tap.

## Checklist
- [x] Expose callback port `1455` in Docker compose.
- [x] Configure xterm web-links addon to activate links without modifier keys.
- [x] Rebuild check for backend bundle.
- [ ] User retest OAuth login callback and link click behavior.
