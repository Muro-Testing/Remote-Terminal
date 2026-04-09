## 2026-04-09 Terminal Rendering Fix

- [x] Inspect mobile terminal frontend and PTY websocket backend
- [x] Remove xterm replay/live-stream collisions in mobile client
- [x] Improve terminal fit handling for viewport and mobile keyboard changes
- [x] Tighten PTY environment to `xterm-256color` and remove extra injected output
- [x] Validate with backend type check
- [ ] Rebuild Docker stack for runtime verification

Notes
- `npm run check` passed.
- `docker compose up -d --build` built successfully but could not start because a container named `remote-terminal-mvp` already exists outside this checkout.
