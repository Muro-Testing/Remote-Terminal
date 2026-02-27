# Project Context

## Project Identity
- Project name: Remote Terminal
- Client name: Internal
- Start date: 2026-02-25
- Owner/contact: Internal

## Goal
- Business goal: Deliver a same-day local-first MVP for remote terminal operations with file management and persisted history.
- Success criteria: Working local MVP via Docker where a single admin can run commands in container sandbox, view streamed output/history, and manage files.

## Scope
- In-scope:
  - Interactive terminal UI
  - Command execution API and websocket streaming
  - File manager (browse/read/write within allowed roots)
  - SQLite persistence for executions, logs, and audit events
  - Dockerized local deployment
- Out-of-scope:
  - Multi-user support and RBAC
  - Production deployment
  - External integrations (Git, SSH/cloud VM targets)
  - Advanced auth hardening beyond single-admin V1 assumptions

## Users and Roles
- User groups:
  - Single admin operator
- Access boundaries:
  - All command execution restricted to container sandbox
  - Filesystem access limited to configured allowed roots
  - No guest/viewer role in V1

## Modules (V1)
- Module 1: Terminal execution service (REST + websocket)
- Module 2: File manager service (list/read/write + audit logging)
- Module 3: Web UI for terminal, history, and file explorer/editor

## Integrations
- Required:
  - Docker / Docker Compose
  - SQLite
- Optional:
  - None in V1

## Tech Stack
- Frontend: Web app (Node-served static SPA)
- Backend/automation: Node.js API service
- Database: SQLite
- Hosting: Local Docker Compose
- Version control: Not initialized in this workspace

## Constraints
- Time: Same-day MVP target (2026-02-25)
- Budget model: Internal project (no billing)
- Compliance/security:
  - Container-isolated execution boundary required
  - Path traversal prevention required for file operations
  - Command timeout and allowed-root validation required

## Delivery and Acceptance
- Milestones:
  - Task 1: Context and planning artifacts
  - Task 2-6: Backend, sandbox, file manager, frontend, Docker run path
  - Task 7: Validation and hygiene
- Acceptance method:
  - Local Docker run verifies command execution, streamed logs, persisted history, and file manager flow
- Change approval method:
  - Written approval in chat required before scope changes

## Known Decisions Log
- 2026-02-25: Project initialized for same-day local-first MVP.
- 2026-02-25: Input is user-entered commands; output is interactive terminal UI with logs.
- 2026-02-25: Single-admin access model selected.
- 2026-02-25: Stack selected as Node.js + Docker + SQLite.
- 2026-02-25: Scope includes file manager in V1.
- 2026-02-25: No external integrations in V1.
