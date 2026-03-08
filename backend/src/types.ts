export type ExecutionStatus = "running" | "completed" | "failed";

export interface ExecutionRecord {
  id: string;
  command: string;
  cwd: string | null;
  status: ExecutionStatus;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  createdBy: string;
}

export interface ExecutionLogRecord {
  id: string;
  executionId: string;
  stream: "stdout" | "stderr" | "system";
  chunk: string;
  createdAt: string;
}

export type ResumeMode = "live_or_context" | "context_only" | "manual";

export type RuntimeClientType = "desktop" | "mobile" | "unknown";

export type SessionSnapshotStatus = "running" | "stopped" | "closed" | "error";

export interface ActorStateRecord {
  actorId: string;
  lastProjectId: string | null;
  lastCwd: string | null;
  lastSessionId: string | null;
  lastClientType: RuntimeClientType;
  autoResumeMode: ResumeMode;
  updatedAt: string;
}

export interface SessionSnapshot {
  sessionId: string;
  actorId: string;
  cwd: string;
  status: SessionSnapshotStatus;
  title: string | null;
  lastActivityAt: string;
  runtimeAlive: boolean;
  updatedAt: string;
}

export interface AttachedClientSummary {
  clientId: string;
  clientType: RuntimeClientType;
  deviceLabel: string;
  isController: boolean;
  lastSeenAt: string;
}

export interface ControllerState {
  controllerClientId: string | null;
  canWrite: boolean;
}

export interface RuntimeStateResponse {
  actorId: string;
  actorState: ActorStateRecord | null;
  defaultCwd: string;
  project: {
    id: string | null;
    name: string | null;
  };
  runtimeAlive: boolean;
  activeSessionId: string | null;
  sessions: SessionSnapshot[];
  attachedClients: AttachedClientSummary[];
  controller: ControllerState;
}
