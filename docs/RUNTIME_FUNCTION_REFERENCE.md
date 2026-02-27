# Runtime Function Reference (Mobile + Terminal Backend)

Last updated: 2026-02-26

This document explains what the current code does so you can validate behavior and decide what to improve.

---

## 1) Where things are stored

### Terminal sessions
- Stored **in backend process memory**, in `runtimeByActor` map.
- File: `backend/src/ws/terminalSocket.ts`
- Key: `actorId` (single-admin now).
- Value:
  - `sessions: Map<sessionId, { term, cwd, status }>`
  - `activeSessionId`
  - current attached websocket
  - detach cleanup timer

Important:
- Sessions survive websocket disconnects for `TERMINAL_DETACH_GRACE_MINUTES`.
- If backend container restarts, memory sessions are lost.

### Files/projects
- Real files are in workspace volume (`/workspace` in container).
- They are persistent across reconnects and container restarts if volume is preserved.

### Auth session
- Cookie-backed, stored in SQLite `sessions` table.
- Refreshed on activity (`last_seen_at`, `expires_at`).

---

## 2) Main behavior flows (ASCII)

### A) Connect / Resume flow

```text
Phone taps Connect
  -> mobile.js connectTerminal()
  -> WS /ws/terminal opens
  -> send {type:list_sessions}
  -> backend returns session_list for actor
      if sessions exist:
         mobile selects active/first session
         status switched/running
      else:
         mobile sends {type:create_session,cwd}
         backend creates PTY session
```

### B) Disconnect / Reconnect preserve flow

```text
WS closes (network/app background)
  -> backend does NOT kill sessions immediately
  -> schedules cleanup after TERMINAL_DETACH_GRACE_MINUTES
  -> phone reconnects later
  -> backend re-attaches socket to same actor runtime
  -> session_list returns old sessions
  -> mobile resumes existing session
```

### C) Callback relay flow

```text
User pastes localhost callback URL
  -> POST /api/oauth/relay-callback
  -> backend validates URL (localhost/127.0.0.1, http, valid port/path)
  -> backend GETs http://127.0.0.1:<port><path><query>
  -> returns {ok,status,location,bodySnippet}

If 502:
  -> nothing listening on that localhost port in container at that moment
```

### D) Why browser Back exits app

```text
In mobile browser/PWA
  Back button = browser history navigation
  no custom history guard currently
  => page can exit to previous site/app
```

---

## 3) Mobile frontend functions (`backend/public/mobile/mobile.js`)

## Core utility
- `joinRelativePath(base, name)`: builds child path under current path.
- `normalizeFileEntries(listResponse)`: normalizes API file list shape.
- `normalizePathValue(pathValue)`: normalizes slashes and trims path format.
- `api(path, options)`: authenticated fetch wrapper with JSON error handling.
- `vibrate()`: short haptic pulse when enabled.
- `updateViewportVar()`: updates `--vh` to visual viewport height.

## Theme/UI mode
- `resolvedTheme(mode)`: resolves `auto|dark|light` to actual theme.
- `applyTheme(mode)`: stores and applies theme; updates terminal colors.
- `getTerminalTheme(mode)`: xterm color palette by mode.
- `setScene(scene)`: switches module scene (terminal/files/access/settings).
- `openDrawer()/closeDrawer()`: left drawer open/close.
- `setScrollMode(mode)`: now enforced locked mode (`View: Locked`).
- `applyFontSize(value)`: sets terminal font size and resizes PTY.
- `setStatus(status, text)`: updates badge + status label.

## Terminal setup/runtime
- `ensureTerminal()`: initializes xterm + fit addon + data callback.
- `appendSessionOutput(sessionId, data)`: appends output to per-session buffer.
- `renderActiveSessionBuffer()`: clears terminal and renders active session buffer.
- `resetSessionBuffers()`: clears local output buffers.

## Sheets / overlays
- `clearSheetTransforms()`: resets swipe animation transforms.
- `closeSheets()`: closes all sheets (`sessions/more/keys/handoff`).
- `openSessionsSheet()`: opens sessions overlay.
- `openMoreSheet()`: opens more overlay.
- `openKeysSheet()`: opens keys overlay.
- `openHandoffSheet()`: opens handoff overlay + generates QR data.

## WebSocket connection logic
- `connectTerminal()`: opens WS, asks for session list, resumes or creates session.
- `startSocketHeartbeat()`: sends `list_sessions` heartbeat every 20s.
- `stopSocketHeartbeat()`: stops heartbeat timer.
- `scheduleAutoReconnect()`: reconnect timer when disconnected.
- `parseMessage(data)`: safe JSON parse for WS payloads.
- `sendTerminalInput(data)`: sends input to active session.

## Helper / auth UX
- `copyText(text)`: copy to clipboard with status feedback.
- `setHelperStatus(text)`: helper status line text.
- `applyHelperProfile(profile)`: profile-specific placeholders/status.
- `runPreparedCommand(command)`: runs predefined installer in terminal.
- `stripAnsi(text)`: strips ANSI escape sequences.
- `getSessionBufferTail(sessionId, maxChars)`: returns recent output tail.
- `getActiveSessionOutputText()`: active session text, ANSI-stripped.
- `updateSelectableOutput()`: updates selectable output textarea.
- `extractUrls(text)`: extracts wrapped URLs from terminal text.
- `maybeCaptureAuthLink(sessionId, latestChunk)`: captures best auth URL + links list.
- `renderDetectedLinks()`: renders helper detected links/actions.
- `getActiveSessionCwd()`: active session cwd fallback chain.
- `buildHandoffPayload()`: builds URL + QR for switch-to-mobile.
- `relayOAuthCallback()`: calls backend callback relay endpoint.
- `pasteDeviceCodeFromClipboard()`: pastes device code into helper field.
- `copyDeviceCode()`: copies helper device code field.
- `sendDeviceCodeToTerminal()`: sends code + Enter into active session.
- `renderQuickInstallers()`: renders installer list buttons.

## Session control
- `sendResize()`: sends terminal resize cols/rows to backend.
- `switchSession(sessionId)`: switches active session and requests backend switch.
- `renderSessions()`: renders sessions list UI.
- `syncSessionLabel()`: updates active session label in header.
- `sendSpecialKey(name)`: maps key name to control sequence and sends it.

## Gestures and input safety
- `bindSwipeSessions()`: horizontal swipe on terminal to switch sessions.
- `bindSwipeCloseForSheet(sheet)`: swipe-down close logic (content-first gating).
- `bindSheetSwipeClose()`: attaches swipe-close to all sheets.
- `bindPullToRefreshGuard()`: prevents top pull-to-refresh reload.

## Files UI
- `refreshFolderPicker(selected)`: loads top-level dirs for terminal cwd select.
- `refreshFilesFolderSelect(selected)`: loads dirs for files tab folder select.
- `createFolderFromTerminal()`: create folder from terminal header action.
- `renderBreadcrumbs(pathValue)`: breadcrumb buttons in files tab.
- `refreshFiles(pathValue)`: list files/folders and render actions.
- `uploadFiles()`: uploads selected files.
- `createFolderFromFiles()`: create folder in current files path.

## Auth and app lifecycle
- `setAuthState(authed, label)`: sets auth UI state.
- `fetchSession()`: checks `/api/auth/session`.
- `login()`: performs login and loads data.
- `logout()`: logs out and disconnects socket.
- `bindInstallPrompt()`: PWA install prompt handling.
- `forceRefreshMobileCachesIfNeeded()`: clears SW/cache on build bump.
- `bindEvents()`: registers all DOM event handlers.
- `ensureAuthenticatedDataLoaded()`: loads initial protected data.
- `bootstrap()`: app entry setup and initial route handling.

Global listeners:
- service worker register
- `error` and `unhandledrejection` UI reporting

---

## 4) Terminal backend functions (`backend/src/ws/terminalSocket.ts`)

## Runtime map
- `runtimeByActor`: in-memory map of terminal runtimes per actor.

## Helper functions
- `getClientIp(request)`: resolve client IP for rate limiting.
- `getOrCreateActorRuntime(actorId)`: returns actor runtime container.
- `sendToRuntime(runtime, payload)`: sends JSON to attached socket.
- `sendSessionList(runtime)`: emits sessions + active session.
- `stopAllTerms(runtime)`: kills all PTY terms in runtime.
- `scheduleRuntimeCleanup(runtime)`: delayed cleanup after detach grace.
- `attachSocket(runtime, socket)`: attach new socket; replace old socket if needed.
- `resolveSessionId(runtime, requestedId)`: resolves target session id.

## Main exported function
- `registerTerminalSocket(server)`:
  - handles websocket upgrade auth/rate-limit
  - binds connection listeners
  - handles all message types:
    - `create_session`
    - `switch_session`
    - `close_session`
    - `list_sessions`
    - `input`
    - `resize`
  - on socket close: keeps runtime alive, schedules cleanup

## Shell/safety helpers
- `assertContainerRuntime()`: blocks host execution unless explicitly allowed.
- `resolveShell()`: chooses shell by platform/container.
- `resolveCwd(cwdRaw)`: validates cwd under workspace root.
- `isWithinRoot(root, target)`: traversal safety check.

---

## 5) Auth service functions (`backend/src/services/authService.ts`)

- `hashToken(input)`: hashes session token with server secret.
- `hashPassword(input)`: SHA-256 password hash.
- `parseCookies(headerValue)`: parse cookie header to map.
- `addHours(isoTs, hours)`: time utility.
- `safeEqualString(a,b)`: timing-safe comparison.

Class `AuthService`:
- `verifyPassword(password)`: checks plain/hash password config.
- `createSession(input)`: inserts DB session + returns token/info.
- `revokeSessionByToken(token)`: marks session revoked.
- `resolveSessionFromRequest(req)`: resolves cookie session.
- `resolveSessionFromToken(token)`: validates, extends session expiry.
- `getSessionCookieName()`: cookie name getter.

---

## 6) OAuth relay route (`backend/src/routes/oauthRelayRoutes.ts`)

- Validates callback URL format and constraints.
- Allows only `http://localhost` or `http://127.0.0.1` with valid port/path/query limits.
- Forwards callback GET to local target.
- Returns status and snippet; returns `502 relay_failed` on connection failure.

---

## 7) Current known behavior relevant to your questions

1. `Connect` and `Reconnect`
- `Connect` asks server for existing sessions first.
- If one exists, it resumes it.
- If none exist, it creates a new one.
- `Reconnect` intentionally closes and reconnects socket, then resumes as above.

2. Why sometimes reconnect lands in another session
- Active session is tracked server-side per actor runtime.
- If active session changed before disconnect, reconnect resumes that active one.

3. Why download + browser back can leave app
- Back is browser history navigation, not in-app route guard.
- No custom back-stack interception yet.

4. Why app can require reconnect after return
- If websocket dropped while app backgrounded, UI reconnect is needed.
- Terminal runtime is preserved (up to detach grace), so session should resume after reconnect.

---

## 8) Suggested next improvements (if you want)

1. Add explicit `Resume Last Session` button and pin last session id in localStorage.
2. Add backend API to expose runtime/session diagnostics for UI debug.
3. Add optional browser back guard in standalone mode (`beforeunload` + history state strategy).
4. Show callback relay detail panel (target port, exact failure reason) in helper.
