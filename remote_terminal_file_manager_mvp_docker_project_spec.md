# Remote Terminal + File Manager MVP (Docker)

## 0. One-line outcome
A self-hosted web app (ChatGPT-like layout) that lets an authenticated user **pick a project folder inside `/workspace`**, **use a live interactive terminal** in that folder from desktop/mobile, and **browse/upload/download files** within `/workspace` — packaged for **one-command Docker deploy**.

---

## 1. MVP scope (what we are building)
### Must-have
1. **Docker-first deployment**
   - Runs as a single container.
   - Host mounts a directory into container at `/workspace`.
   - App serves UI + API from the same server.

2. **Password login**
   - Simple password gate (single password from env var).
   - Session cookie based auth.

3. **Root directory isolation**
   - The app can only read/write/list files **inside `/workspace`**.
   - Terminal sessions can only start inside `/workspace/<selected-subfolder>`.
   - Any attempt to escape the root (e.g. `../`) is blocked in file APIs.

4. **Folder picker**
   - UI can list **direct children** (subfolders) of `/workspace`.
   - User selects a subfolder to work in.

5. **Interactive terminal (PTY)**
   - Real PTY shell via `node-pty`.
   - Full interactive behavior (`cd`, `vim`, `git`, `cline`, etc.).
   - Live output streaming via WebSocket.
   - **MVP: one active terminal session at a time**.

6. **Mobile usability controls**
   - On-screen keys: `Ctrl`, `Esc`, `Tab`, `↑ ↓ ← →`, `Ctrl+C` (Interrupt).
   - Works in mobile browsers.

7. **File explorer panel**
   - Browse folders within `/workspace`.
   - Drag & drop upload (multi-file).
   - Download files.
   - Create folder.
   - Create empty file.
   - Delete file/folder (optional for MVP; if included must confirm).

### Nice-to-have (only if trivial)
- Remember last selected folder per browser (localStorage).
- Basic search filter in file list.

---

## 2. Non-goals (explicitly excluded)
- No Git-specific UI (you run git in terminal).
- No LLM integration.
- No multi-user roles.
- No internet exposure by default.
- No “attach to existing host terminals”.
- No file editor in UI (terminal/editor handles it).

---

## 3. Security requirements (hard constraints)
1. **Bind address**
   - Default bind: `127.0.0.1` (inside container: bind `0.0.0.0`, but recommended docker publish only to localhost on host).
   - Provide docs for safe exposure via Cloudflare Tunnel later.

2. **Auth**
   - Env var: `APP_PASSWORD` required.
   - Login endpoint sets `HttpOnly` cookie.
   - Use SameSite cookies.
   - CSRF protection for state-changing routes OR use same-origin + custom header + SameSite strict.

3. **Path safety**
   - All file operations must resolve paths with `realpath` and verify prefix `/workspace`.
   - Reject absolute paths from client.
   - Reject any path with null bytes.
   - Never follow symlinks that escape `/workspace`.

4. **Upload safety**
   - Max upload size configurable (`MAX_UPLOAD_MB`, default 50).
   - Reject files that would write outside `/workspace`.

5. **Terminal safety**
   - Terminal is powerful; mitigate blast radius by:
     - Running app as non-root user inside container.
     - Restrict terminal working area to mounted volume (still user-controlled).

6. **Auditability (MVP light)**
   - Log: login attempts, terminal session start/stop, file uploads/deletes.

---

## 4. Tech stack (locked)
### Backend
- Node.js + TypeScript
- Express
- `ws` (WebSocket)
- `node-pty`
- `express-session` (or signed cookie session)
- `helmet` for basic headers
- `multer` for uploads

### Frontend
- React + TypeScript
- Vite
- `xterm` + `xterm-addon-fit`
- Minimal CSS (Tailwind optional, not required)

### Packaging
- Dockerfile (multi-stage build preferred)
- docker-compose.yml example

---

## 5. UX layout (ChatGPT-like)
### Desktop
- Left sidebar:
  - App name
  - Folder picker (dropdown)
  - Terminal status (connected/disconnected)
  - File explorer toggle
  - Logout
- Main area:
  - Top: breadcrumbs (current folder)
  - Center: terminal pane (xterm)
  - Right (or bottom split): file explorer panel
- Bottom action row:
  - Mobile key strip can appear here on small screens

### Mobile
- Terminal full-screen
- Floating/bottom **key bar** with:
  - `Ctrl` (toggle/hold)
  - `Esc`
  - `Tab`
  - `↑ ↓ ← →`
  - `Ctrl+C`
  - Optional: `Alt`, `PgUp/PgDn` (not required)

---

## 6. Terminal behavior spec
### Session lifecycle (MVP)
- One session at a time per logged-in browser.
- Creating a new session kills the previous PTY cleanly.
- Session starts in selected folder:
  - `/workspace/<chosenSubfolder>`

### Shell selection
- Linux container: default `/bin/bash`.
- If bash not present, use `/bin/sh`.

### WebSocket protocol
Endpoint: `GET /ws/terminal`
- Client connects after login.
- Server requires auth cookie.

Messages (JSON):
- Client → Server
  - `{ "type": "resize", "cols": number, "rows": number }`
  - `{ "type": "input", "data": string }`  // raw keystrokes
  - `{ "type": "start", "cwd": "relative/subfolder" }` // start terminal in selected folder
  - `{ "type": "stop" }`

- Server → Client
  - `{ "type": "output", "data": string }`
  - `{ "type": "status", "status": "started"|"stopped"|"error", "message"?: string }`

Notes:
- Send terminal output as soon as PTY emits data.
- Keep output raw; xterm will render.

### Mobile special keys mapping
- `Ctrl` toggle:
  - When enabled, next keypress sends control sequence if applicable.
  - For letters: `Ctrl+A` = `\x01`, etc.
- `Ctrl+C` button: send `\x03`.
- `Esc`: send `\x1b`.
- `Tab`: send `\t`.
- Arrow keys:
  - Up: `\x1b[A`
  - Down: `\x1b[B`
  - Right: `\x1b[C`
  - Left: `\x1b[D`

---

## 7. File explorer spec
### Root rules
- All operations are relative to `/workspace`.
- API accepts `path` as a **relative path** (e.g. `my-site/assets`).

### API endpoints
All endpoints require auth.

1) List folder
- `GET /api/fs/list?path=<relative>`
- Response:
  - `{ path: string, entries: Array<{ name: string, type: "file"|"dir", size?: number, mtime?: string }> }`

2) Create folder
- `POST /api/fs/mkdir`
- Body: `{ path: "relative/newFolder" }`

3) Create empty file
- `POST /api/fs/touch`
- Body: `{ path: "relative/newFile.ext" }`

4) Delete
- `POST /api/fs/delete`
- Body: `{ path: "relative/item", recursive?: boolean }`
- Must confirm in UI.

5) Upload (drag & drop)
- `POST /api/fs/upload?path=<relative-dir>`
- multipart form field: `files`
- Supports multiple files.

6) Download
- `GET /api/fs/download?path=<relative-file>`
- Returns file stream with correct headers.

7) List project subfolders (folder picker)
- `GET /api/projects`
- Returns direct subfolders of `/workspace`:
  - `{ projects: Array<{ name: string, path: string }> }`

### UI behaviors
- Left panel (or right panel) shows:
  - current folder
  - clickable folders
  - file list with download action
  - drag-drop area
- Drag & drop:
  - drop files onto explorer → upload into current folder
  - show progress + success/fail

---

## 8. Authentication spec
### Endpoints
- `POST /api/auth/login`
  - Body: `{ password: string }`
  - If ok: set session cookie.
- `POST /api/auth/logout`
- `GET /api/auth/me`
  - Returns `{ authenticated: boolean }`

### Cookie requirements
- `HttpOnly: true`
- `SameSite: Lax` (or Strict if feasible)
- `Secure: true` when behind HTTPS (Cloudflare tunnel later)

---

## 9. Configuration (env vars)
Required:
- `APP_PASSWORD` — login password

Optional:
- `PORT` (default 8080)
- `MAX_UPLOAD_MB` (default 50)
- `LOG_LEVEL` (default info)

Filesystem constants:
- `WORKSPACE_ROOT=/workspace` (fixed inside container)

---

## 10. Docker deployment
### Dockerfile requirements
- Multi-stage:
  1) Build frontend
  2) Build backend TS
  3) Runtime image
- Runtime user must be non-root.

### docker-compose.yml example
- Service publishes `127.0.0.1:8080:8080`
- Mount host directory:
  - `./Projects:/workspace`
- Env:
  - `APP_PASSWORD=...`

---

## 11. Repository structure (recommended)
```
repo/
  backend/
    src/
      server.ts
      auth.ts
      terminal.ts
      fsRoutes.ts
      projectsRoutes.ts
      pathSafety.ts
    package.json
    tsconfig.json
  frontend/
    src/
      App.tsx
      Login.tsx
      TerminalView.tsx
      FileExplorer.tsx
      api.ts
      mobileKeys.ts
    index.html
    package.json
    vite.config.ts
  Dockerfile
  docker-compose.yml
  README.md
```

---

## 12. Implementation order (agent should follow)
1. Backend skeleton (Express + health check).
2. Auth endpoints + session cookie middleware.
3. Path safety utility (`resolveSafePath`).
4. Projects listing endpoint (`/api/projects`).
5. File explorer endpoints (list/mkdir/touch/upload/download/delete).
6. WebSocket terminal endpoint + node-pty integration.
7. Frontend login page + auth gating.
8. Terminal UI with xterm + websocket.
9. Mobile key bar + key mapping.
10. File explorer UI + drag-drop upload.
11. Dockerfile + compose + README run instructions.

---

## 13. Acceptance checklist (MVP passes when…)
- [ ] `docker compose up` starts app.
- [ ] Visiting `http://localhost:8080` shows login.
- [ ] Correct password logs in; incorrect password fails.
- [ ] Folder picker lists subfolders of mounted host directory.
- [ ] Starting terminal opens shell in selected folder.
- [ ] `pwd` shows `/workspace/<selected>`.
- [ ] `cd ..` stays inside `/workspace` (allowed) but file API never escapes root.
- [ ] Mobile buttons send expected control sequences.
- [ ] File explorer lists files; upload via drag-drop works.
- [ ] Download returns correct file.
- [ ] All file APIs reject attempts to escape root.

---

## 14. Notes for later (post-MVP)
- Multi-terminal sessions with switching.
- Cloudflare Tunnel guide + Access policy.
- 2FA/TOTP inside app.
- Command approvals / risk tiers.
- Audit log UI.



---

## 15. Tool Installer Panel (MVP Add-on)

### Purpose
Provide a safe, user-friendly way to install common CLI developer tools into the persistent mounted workspace without auto-executing commands.

### Design Principles
- No automatic command execution from UI.
- Only "Copy to Clipboard" behavior.
- All installs must target persistent paths inside `/workspace`.
- Terminal automatically includes persistent tool path in `PATH` on startup.

---

### Persistent Tool Directory Strategy
All npm-based CLI tools should install into:

`/workspace/.tools/npm`

On terminal session start, backend must prepend:

`/workspace/.tools/npm/bin`

to the shell `PATH`.

Implementation detail (terminal spawn):
- Inject env override when spawning PTY:
  - `PATH=/workspace/.tools/npm/bin:$PATH`

---

### UI: Tool Installer Panel
Add a collapsible panel in sidebar labeled:

"Install Developer Tools"

Each tool entry contains:
- Tool name
- Short description
- "Copy Install Command" button
- Optional link to official docs

No auto-run buttons.

---

### Example Predefined Install Commands

#### 1. Configure Persistent npm Prefix (Required First Step)
Clipboard content:

```
npm config set prefix /workspace/.tools/npm
export PATH=/workspace/.tools/npm/bin:$PATH
```

---

#### 2. Install Codex CLI (npm example)
```
npm install -g @openai/codex
```

---

#### 3. Install Gemini CLI (npm example)
```
npm install -g @google/generative-ai-cli
```

---

#### 4. Install Cline (if npm-based variant)
```
npm install -g cline
```

---

### Important UX Behavior
- After copying commands, UI shows reminder:
  "Paste into terminal and restart session after install."
- Provide "Restart Terminal" button that:
  - Stops current PTY
  - Starts new PTY with updated PATH

---

### Safety Rules
- Tool panel must NOT execute commands automatically.
- No remote script fetching.
- Only static predefined commands.
- Custom user commands must be pasted manually.

---

### Acceptance Criteria
- Tools installed remain available after container restart.
- Installed binaries resolve via `which <tool>`.
- PATH automatically includes persistent tool directory.
- No tool install breaks container permissions.

