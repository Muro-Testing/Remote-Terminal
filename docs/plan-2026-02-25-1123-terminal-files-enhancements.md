# Plan: Terminal Continuity + File Actions Enhancements

Date: 2026-02-25 11:23

## Goal
Improve terminal UX to behave like one continuous console and add missing file manager actions (create file, create folder, upload).

## Checklist
- [x] Add backend endpoints for folder creation and empty file creation.
- [x] Add backend upload endpoint for multi-file uploads.
- [x] Add file service helpers and audit events for new operations.
- [x] Add UI buttons for create folder, create file, and upload files.
- [x] Change terminal output behavior to append command sessions in one continuous stream.
- [x] Replace command-runner UI with true persistent PTY websocket terminal (`/ws/terminal`).
- [x] Add download endpoint and image preview behavior in file explorer.
- [x] Add host-shell fallback for local non-container debugging when `ALLOW_HOST_EXECUTION=1`.
- [x] Run type/build checks.
- [x] Run API smoke tests for `mkdir`, `touch`, `upload`, and `list`.
- [x] Run PTY websocket smoke test (`start` + interactive input).

## Validation Notes
- `npm run check` passed.
- `npm run build` passed.
- API smoke test responses returned success for:
  - `POST /api/files/mkdir`
  - `POST /api/files/touch`
  - `POST /api/files/upload`
  - `GET /api/files?path=notes`
- PTY websocket smoke test confirmed status `started` and interactive shell output stream.
