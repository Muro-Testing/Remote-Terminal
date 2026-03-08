# Continuity Upgrade Plan (Execution Checklist)

Date: 2026-03-06
Task: Implement the first shipping slice of the remote continuity upgrade.

## Checklist

- [x] Add continuity persistence tables and backend types.
- [x] Implement actor/session continuity service and runtime diagnostics API.
- [x] Refactor terminal websocket runtime for multi-client attach and controller ownership.
- [x] Persist project/cwd/session continuity from terminal and project flows.
- [x] Add desktop continuity UI and local last-session persistence.
- [x] Add mobile continuity card and explicit resume/recover controls.
- [x] Update runtime reference and project context docs for the new model.
- [x] Run TypeScript validation and targeted behavior checks.
