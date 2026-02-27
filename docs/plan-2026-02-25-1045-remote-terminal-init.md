# Plan: Remote Terminal Initialization (Task 1)

Date: 2026-02-25 10:45

## Goal
Initialize project context and execution checklist for same-day Remote Terminal MVP.

## Checklist
- [x] Confirm required project bootstrap files exist (`AGENTS.md`, `PROJECT_CONTEXT.md`, `docs/`, `docs/CHANGELOG_CUSTOM.md`).
- [x] Refresh `PROJECT_CONTEXT.md` with locked business/technical decisions.
- [x] Create first timestamped plan file in `docs/`.
- [x] Get user approval to proceed to Task 2 (backend scaffold).
- [x] Scaffold backend service (Node.js + TypeScript + Express).
- [x] Add health route and API skeletons for execution and files endpoints.
- [x] Add SQLite schema and persistence service stubs (`executions`, `execution_logs`, `audit_events`).
- [x] Add websocket scaffold at `/ws/executions/:id` for execution event subscription.
- [x] Validate TypeScript build configuration (`npm run check`).
- [x] Get user approval to proceed to Task 3 (secure execution sandbox).
- [x] Replace execution runner stub with real shell execution adapter.
- [x] Enforce container runtime check (`/.dockerenv`) with optional explicit host override (`ALLOW_HOST_EXECUTION=1`).
- [x] Enforce allowed workspace cwd resolution under `WORKSPACE_ROOT`.
- [x] Add execution timeout termination and system log reporting.
- [x] Stream stdout/stderr into persisted execution logs and websocket subscribers.
- [x] Persist audit events for execution start/completion/failure.
- [x] Re-validate TypeScript build configuration (`npm run check`).
- [x] Get user approval to proceed to Task 4 (file manager API implementation).
- [x] Implement secure file path resolution utility with workspace-root confinement.
- [x] Implement `GET /api/files` with directory listing and metadata.
- [x] Implement `POST /api/files/read` with UTF-8 + size limit checks.
- [x] Implement `POST /api/files/write` with UTF-8 + size limit checks.
- [x] Add audit logging for file list/read/write actions.
- [x] Validate TypeScript build configuration (`npm run check`).
- [x] Smoke test file APIs (list/write/read) and traversal rejection (`path=..`).
- [x] Get user approval to proceed to Task 5 (frontend MVP).
- [x] Add Node-served SPA frontend (`backend/public`) with responsive 3-panel layout.
- [x] Implement terminal command form + output stream panel + status badge.
- [x] Implement execution history panel (`GET /api/executions`, `GET /api/executions/:id`).
- [x] Implement websocket integration for live log/status updates (`/ws/executions/:id`).
- [x] Implement file explorer list/open flows (`GET /api/files`) and inline editor read/save (`POST /api/files/read`, `POST /api/files/write`).
- [x] Wire static hosting in backend server for `/`.
- [x] Validate TypeScript build configuration (`npm run check`).
- [x] Smoke test UI serving and health API (`/` and `/api/health`).
- [x] Get user approval to proceed to Task 6 (docker compose and local run path).
- [x] Add root Dockerfile for production-style backend+frontend image.
- [x] Add root `docker-compose.yml` with persistent data volume and workspace bind mount.
- [x] Add `.env.example` for runtime configuration.
- [x] Add `README.md` with one-command startup and endpoint references.
- [ ] Validate Docker runtime startup (`docker compose up`) in environment (blocked: Docker engine not running).
- [x] Get user approval to proceed to Task 7 (validation and hygiene).
- [x] Re-run validation checks (`npm run check`, `npm run build`).
- [x] Prepare plain-English summary of implemented changes.
- [x] Prepare include/exclude file list for future push confirmation.
- [x] Keep `docs/CHANGELOG_CUSTOM.md` unchanged (no push happened).

## Locked Decisions
- MVP type: terminal web app with file manager.
- Primary input: user-entered commands.
- Primary output: interactive terminal UI + persisted logs/history.
- Access model: single admin user.
- Stack: Node.js + Docker + SQLite.
- Timeline: same-day MVP.
- Integrations: none for V1.
- Security boundary: container sandbox only.
- Budget model: internal project.
- Change control: written approval in chat.

## Task 2 Preview
- Scaffold backend service (Node.js)
- Add health route and API skeleton:
  - `POST /api/exec`
  - `GET /api/executions`
  - `GET /api/executions/:id`
  - `GET /api/files`
  - `POST /api/files/read`
  - `POST /api/files/write`
- Create SQLite schema files and service layer stubs.
