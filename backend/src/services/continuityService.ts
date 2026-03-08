import path from "node:path";
import { db } from "../db/client.js";
import { config } from "../config.js";
import type {
  ActorStateRecord,
  ResumeMode,
  RuntimeClientType,
  RuntimeStateResponse,
  SessionSnapshot,
  SessionSnapshotStatus
} from "../types.js";

interface ActorStateRow {
  actor_id: string;
  last_project_id: string | null;
  last_cwd: string | null;
  last_session_id: string | null;
  last_client_type: RuntimeClientType;
  auto_resume_mode: ResumeMode;
  updated_at: string;
}

interface SessionSnapshotRow {
  session_id: string;
  actor_id: string;
  cwd: string;
  status: SessionSnapshotStatus;
  title: string | null;
  last_activity_at: string;
  runtime_alive: number;
  updated_at: string;
}

interface RuntimeStateBuildInput {
  actorId: string;
  runtimeAlive: boolean;
  activeSessionId: string | null;
  attachedClients: RuntimeStateResponse["attachedClients"];
  controllerClientId: string | null;
}

function mapActorState(row: ActorStateRow | undefined): ActorStateRecord | null {
  if (!row) {
    return null;
  }
  return {
    actorId: row.actor_id,
    lastProjectId: row.last_project_id,
    lastCwd: row.last_cwd,
    lastSessionId: row.last_session_id,
    lastClientType: row.last_client_type,
    autoResumeMode: row.auto_resume_mode,
    updatedAt: row.updated_at
  };
}

function mapSnapshot(row: SessionSnapshotRow): SessionSnapshot {
  return {
    sessionId: row.session_id,
    actorId: row.actor_id,
    cwd: row.cwd,
    status: row.status,
    title: row.title,
    lastActivityAt: row.last_activity_at,
    runtimeAlive: row.runtime_alive === 1,
    updatedAt: row.updated_at
  };
}

function getProjectSummary(projectId: string | null): { id: string | null; name: string | null } {
  if (!projectId) {
    return { id: null, name: null };
  }
  const row = db
    .prepare("SELECT id, name FROM projects WHERE id = ?")
    .get(projectId) as { id: string; name: string } | undefined;
  return row ? { id: row.id, name: row.name } : { id: projectId, name: null };
}

function detectProjectIdFromCwd(cwd: string | null): string | null {
  if (!cwd) {
    return null;
  }
  const root = path.resolve(config.workspaceRoot);
  const absolute = path.resolve(root, cwd);
  const row = db
    .prepare(
      `SELECT id
       FROM projects
       WHERE ? = local_path
          OR ? LIKE local_path || '/%'
       ORDER BY LENGTH(local_path) DESC
       LIMIT 1`
    )
    .get(absolute, absolute) as { id: string } | undefined;
  return row?.id ?? null;
}

export interface UpdateActorStateInput {
  actorId: string;
  lastProjectId?: string | null;
  lastCwd?: string | null;
  lastSessionId?: string | null;
  lastClientType?: RuntimeClientType;
  autoResumeMode?: ResumeMode;
}

export interface UpdateSessionSnapshotInput {
  actorId: string;
  sessionId: string;
  cwd: string;
  status: SessionSnapshotStatus;
  title?: string | null;
  lastActivityAt?: string;
  runtimeAlive?: boolean;
}

export function getActorState(actorId: string): ActorStateRecord | null {
  const row = db
    .prepare(
      `SELECT actor_id, last_project_id, last_cwd, last_session_id, last_client_type, auto_resume_mode, updated_at
       FROM actor_state
       WHERE actor_id = ?`
    )
    .get(actorId) as ActorStateRow | undefined;
  return mapActorState(row);
}

export function listSessionSnapshots(actorId: string): SessionSnapshot[] {
  const rows = db
    .prepare(
      `SELECT session_id, actor_id, cwd, status, title, last_activity_at, runtime_alive, updated_at
       FROM session_snapshots
       WHERE actor_id = ?
       ORDER BY runtime_alive DESC, updated_at DESC`
    )
    .all(actorId) as SessionSnapshotRow[];
  return rows.map(mapSnapshot);
}

export function upsertActorState(input: UpdateActorStateInput): ActorStateRecord {
  const current = getActorState(input.actorId);
  const now = new Date().toISOString();
  const lastCwd =
    input.lastCwd !== undefined
      ? input.lastCwd
      : current?.lastCwd ?? getDefaultProjectPath() ?? ".";
  const lastProjectId =
    input.lastProjectId !== undefined
      ? input.lastProjectId
      : current?.lastProjectId ?? detectProjectIdFromCwd(lastCwd);

  db.prepare(
    `INSERT INTO actor_state (
       actor_id, last_project_id, last_cwd, last_session_id, last_client_type, auto_resume_mode, updated_at
     ) VALUES (
       @actorId, @lastProjectId, @lastCwd, @lastSessionId, @lastClientType, @autoResumeMode, @updatedAt
     )
     ON CONFLICT(actor_id) DO UPDATE SET
       last_project_id = excluded.last_project_id,
       last_cwd = excluded.last_cwd,
       last_session_id = excluded.last_session_id,
       last_client_type = excluded.last_client_type,
       auto_resume_mode = excluded.auto_resume_mode,
       updated_at = excluded.updated_at`
  ).run({
    actorId: input.actorId,
    lastProjectId,
    lastCwd,
    lastSessionId:
      input.lastSessionId !== undefined ? input.lastSessionId : current?.lastSessionId ?? null,
    lastClientType:
      input.lastClientType !== undefined ? input.lastClientType : current?.lastClientType ?? "unknown",
    autoResumeMode:
      input.autoResumeMode !== undefined ? input.autoResumeMode : current?.autoResumeMode ?? "live_or_context",
    updatedAt: now
  });

  return getActorState(input.actorId) as ActorStateRecord;
}

export function upsertSessionSnapshot(input: UpdateSessionSnapshotInput): SessionSnapshot {
  const now = new Date().toISOString();
  const lastActivityAt = input.lastActivityAt ?? now;
  db.prepare(
    `INSERT INTO session_snapshots (
       session_id, actor_id, cwd, status, title, last_activity_at, runtime_alive, updated_at
     ) VALUES (
       @sessionId, @actorId, @cwd, @status, @title, @lastActivityAt, @runtimeAlive, @updatedAt
     )
     ON CONFLICT(session_id) DO UPDATE SET
       actor_id = excluded.actor_id,
       cwd = excluded.cwd,
       status = excluded.status,
       title = excluded.title,
       last_activity_at = excluded.last_activity_at,
       runtime_alive = excluded.runtime_alive,
       updated_at = excluded.updated_at`
  ).run({
    sessionId: input.sessionId,
    actorId: input.actorId,
    cwd: input.cwd,
    status: input.status,
    title: input.title ?? null,
    lastActivityAt,
    runtimeAlive: input.runtimeAlive ? 1 : 0,
    updatedAt: now
  });

  const row = db
    .prepare(
      `SELECT session_id, actor_id, cwd, status, title, last_activity_at, runtime_alive, updated_at
       FROM session_snapshots
       WHERE session_id = ?`
    )
    .get(input.sessionId) as SessionSnapshotRow;
  return mapSnapshot(row);
}

export function setSnapshotRuntimeAlive(actorId: string, sessionId: string, runtimeAlive: boolean): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE session_snapshots
     SET runtime_alive = ?, updated_at = ?
     WHERE actor_id = ? AND session_id = ?`
  ).run(runtimeAlive ? 1 : 0, now, actorId, sessionId);
}

export function closeSessionSnapshot(actorId: string, sessionId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE session_snapshots
     SET status = 'closed', runtime_alive = 0, updated_at = ?, last_activity_at = ?
     WHERE actor_id = ? AND session_id = ?`
  ).run(now, now, actorId, sessionId);
}

export function markAllRuntimeSessionsOffline(actorId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE session_snapshots
     SET runtime_alive = 0, updated_at = ?
     WHERE actor_id = ?`
  ).run(now, actorId);
}

export function recordProjectOpen(actorId: string, projectId: string, cwd: string): ActorStateRecord {
  return upsertActorState({
    actorId,
    lastProjectId: projectId,
    lastCwd: cwd
  });
}

export function getDefaultProjectPath(): string | null {
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = 'default_project_path'")
    .get() as { value: string | null } | undefined;
  return row?.value ?? null;
}

export function getPreferredCwd(actorId: string): string {
  const state = getActorState(actorId);
  return state?.lastCwd ?? getDefaultProjectPath() ?? ".";
}

export function buildRuntimeState(input: RuntimeStateBuildInput): RuntimeStateResponse {
  const actorState = getActorState(input.actorId);
  const defaultCwd = actorState?.lastCwd ?? getDefaultProjectPath() ?? ".";
  const sessions = listSessionSnapshots(input.actorId);
  return {
    actorId: input.actorId,
    actorState,
    defaultCwd,
    project: getProjectSummary(actorState?.lastProjectId ?? detectProjectIdFromCwd(defaultCwd)),
    runtimeAlive: input.runtimeAlive,
    activeSessionId: input.activeSessionId,
    sessions,
    attachedClients: input.attachedClients,
    controller: {
      controllerClientId: input.controllerClientId,
      canWrite: false
    }
  };
}
