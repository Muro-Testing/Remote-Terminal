import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, Server } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import pty from "node-pty";
import { config } from "../config.js";
import { authService } from "../services/authService.js";
import {
  buildRuntimeState,
  closeSessionSnapshot,
  getPreferredCwd,
  markAllRuntimeSessionsOffline,
  setSnapshotRuntimeAlive,
  upsertActorState,
  upsertSessionSnapshot
} from "../services/continuityService.js";
import { SlidingWindowRateLimiter } from "../services/rateLimit.js";
import type { AttachedClientSummary, RuntimeClientType } from "../types.js";

const connectLimiter = new SlidingWindowRateLimiter();

type AuthedUpgradeRequest = IncomingMessage & { authActorId?: string };

interface TerminalSessionRuntime {
  term: pty.IPty;
  cwd: string;
  absoluteCwd: string;
  status: "running" | "stopped";
  createdAt: string;
  lastActivityAt: string;
  lastSnapshotAt: string;
  title: string;
  outputBuffer: string;
}

interface AttachedClient {
  clientId: string;
  socket: WebSocket;
  clientType: RuntimeClientType;
  deviceLabel: string;
  lastSeenAt: string;
}

interface ActorTerminalRuntime {
  actorId: string;
  sessions: Map<string, TerminalSessionRuntime>;
  activeSessionId: string | null;
  clients: Map<string, AttachedClient>;
  controllerClientId: string | null;
  detachTimer: NodeJS.Timeout | null;
}

interface SessionSummary {
  id: string;
  cwd: string;
  status: "running" | "stopped";
  title: string;
  lastActivityAt: string;
}

interface RuntimeSummary {
  actorId: string;
  activeSessionId: string | null;
  controllerClientId: string | null;
  attachedClients: AttachedClientSummary[];
  sessions: SessionSummary[];
}

function getClientIp(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = value?.split(",")[0]?.trim() ?? request.socket.remoteAddress ?? "unknown";
  return ip || "unknown";
}

interface HelloMessage {
  type: "hello";
  clientId?: string;
  clientType?: RuntimeClientType;
  deviceLabel?: string;
  resumeSessionId?: string;
  preferredProjectId?: string;
  preferredCwd?: string;
}

interface CreateSessionMessage {
  type: "create_session";
  cwd?: string;
  cols?: number;
  rows?: number;
}

interface SwitchSessionMessage {
  type: "switch_session";
  sessionId: string;
}

interface CloseSessionMessage {
  type: "close_session";
  sessionId: string;
}

interface ListSessionsMessage {
  type: "list_sessions";
}

interface ResumeSessionMessage {
  type: "resume_session";
  sessionId: string;
}

interface RequestControlMessage {
  type: "request_control";
}

interface ReleaseControlMessage {
  type: "release_control";
}

interface InputMessage {
  type: "input";
  sessionId?: string;
  data: string;
}

interface ResizeMessage {
  type: "resize";
  sessionId?: string;
  cols: number;
  rows: number;
}

type ClientMessage =
  | HelloMessage
  | CreateSessionMessage
  | SwitchSessionMessage
  | CloseSessionMessage
  | ListSessionsMessage
  | ResumeSessionMessage
  | RequestControlMessage
  | ReleaseControlMessage
  | InputMessage
  | ResizeMessage;

const runtimeByActor = new Map<string, ActorTerminalRuntime>();

function getOrCreateActorRuntime(actorId: string): ActorTerminalRuntime {
  const existing = runtimeByActor.get(actorId);
  if (existing) {
    return existing;
  }
  const created: ActorTerminalRuntime = {
    actorId,
    sessions: new Map<string, TerminalSessionRuntime>(),
    activeSessionId: null,
    clients: new Map<string, AttachedClient>(),
    controllerClientId: null,
    detachTimer: null
  };
  runtimeByActor.set(actorId, created);
  return created;
}

function getClientSummaries(runtime: ActorTerminalRuntime): AttachedClientSummary[] {
  return Array.from(runtime.clients.values()).map((client) => ({
    clientId: client.clientId,
    clientType: client.clientType,
    deviceLabel: client.deviceLabel,
    isController: client.clientId === runtime.controllerClientId,
    lastSeenAt: client.lastSeenAt
  }));
}

function getSessionSummaries(runtime: ActorTerminalRuntime): SessionSummary[] {
  return Array.from(runtime.sessions.entries()).map(([id, session]) => ({
    id,
    cwd: session.cwd,
    status: session.status,
    title: session.title,
    lastActivityAt: session.lastActivityAt
  }));
}

function sendToSocket(socket: WebSocket, payload: object): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(runtime: ActorTerminalRuntime, payload: object): void {
  for (const client of runtime.clients.values()) {
    sendToSocket(client.socket, payload);
  }
}

function sendRuntimeState(runtime: ActorTerminalRuntime): void {
  const baseState = buildRuntimeState({
    actorId: runtime.actorId,
    runtimeAlive: runtime.sessions.size > 0,
    activeSessionId: runtime.activeSessionId,
    attachedClients: getClientSummaries(runtime),
    controllerClientId: runtime.controllerClientId
  });

  for (const client of runtime.clients.values()) {
    sendToSocket(client.socket, {
      type: "runtime_state",
      ...baseState,
      controller: {
        controllerClientId: runtime.controllerClientId,
        canWrite: client.clientId === runtime.controllerClientId
      }
    });
  }
}

function sendControlChanged(runtime: ActorTerminalRuntime): void {
  broadcast(runtime, {
    type: "control_changed",
    controllerClientId: runtime.controllerClientId,
    attachedClients: getClientSummaries(runtime)
  });
}

function sendSessionList(runtime: ActorTerminalRuntime): void {
  broadcast(runtime, {
    type: "session_list",
    sessions: getSessionSummaries(runtime),
    activeSessionId: runtime.activeSessionId
  });
  sendRuntimeState(runtime);
}

function appendOutputBuffer(session: TerminalSessionRuntime, chunk: string): void {
  const next = `${session.outputBuffer}${chunk}`;
  session.outputBuffer = next.length > 120_000 ? next.slice(next.length - 120_000) : next;
}

function sendBufferSnapshot(socket: WebSocket, runtime: ActorTerminalRuntime, sessionId: string | null): void {
  if (!sessionId) {
    return;
  }
  const session = runtime.sessions.get(sessionId);
  if (!session) {
    return;
  }
  sendToSocket(socket, {
    type: "buffer_snapshot",
    sessionId,
    data: session.outputBuffer
  });
}

function stopAllTerms(runtime: ActorTerminalRuntime): void {
  for (const { term } of runtime.sessions.values()) {
    term.kill();
  }
  runtime.sessions.clear();
  runtime.activeSessionId = null;
  runtime.controllerClientId = null;
  markAllRuntimeSessionsOffline(runtime.actorId);
}

function scheduleRuntimeCleanup(runtime: ActorTerminalRuntime): void {
  if (runtime.detachTimer) {
    clearTimeout(runtime.detachTimer);
    runtime.detachTimer = null;
  }
  const graceMs = Math.max(1, config.terminalDetachGraceMinutes) * 60_000;
  runtime.detachTimer = setTimeout(() => {
    if (runtime.clients.size > 0) {
      return;
    }
    stopAllTerms(runtime);
    runtimeByActor.delete(runtime.actorId);
  }, graceMs);
}

function touchClient(runtime: ActorTerminalRuntime, clientId: string): AttachedClient | null {
  const client = runtime.clients.get(clientId);
  if (!client) {
    return null;
  }
  client.lastSeenAt = new Date().toISOString();
  return client;
}

function resolveSessionId(runtime: ActorTerminalRuntime, requestedId?: string): string | null {
  const sid = requestedId ?? runtime.activeSessionId;
  if (!sid || !runtime.sessions.has(sid)) {
    return null;
  }
  return sid;
}

function syncSessionState(runtime: ActorTerminalRuntime, sessionId: string): void {
  const session = runtime.sessions.get(sessionId);
  if (!session) {
    return;
  }
  upsertSessionSnapshot({
    actorId: runtime.actorId,
    sessionId,
    cwd: session.cwd,
    status: session.status,
    title: session.title,
    lastActivityAt: session.lastActivityAt,
    runtimeAlive: true
  });
  session.lastSnapshotAt = new Date().toISOString();
}

function maybeSyncSessionState(runtime: ActorTerminalRuntime, sessionId: string): void {
  const session = runtime.sessions.get(sessionId);
  if (!session) {
    return;
  }
  const now = Date.now();
  const previous = Date.parse(session.lastSnapshotAt || session.createdAt);
  if (Number.isNaN(previous) || now - previous >= 10_000) {
    syncSessionState(runtime, sessionId);
  }
}

function updateActorContinuity(
  runtime: ActorTerminalRuntime,
  input: {
    lastSessionId?: string | null;
    lastCwd?: string | null;
    lastClientType?: RuntimeClientType;
  }
): void {
  upsertActorState({
    actorId: runtime.actorId,
    lastSessionId: input.lastSessionId,
    lastCwd: input.lastCwd,
    lastClientType: input.lastClientType
  });
}

function relativeTitle(cwd: string): string {
  if (cwd === ".") {
    return "workspace";
  }
  return path.basename(cwd) || cwd;
}

async function resolveWorkspaceCwd(cwdRaw?: string): Promise<{ absolute: string; relative: string }> {
  const requested = cwdRaw && cwdRaw.trim().length > 0 ? cwdRaw : ".";
  if (requested.includes("\0")) {
    throw new Error("Invalid cwd path.");
  }

  const root = await fs.promises.realpath(config.workspaceRoot);
  const resolvedPath = path.resolve(root, requested);
  const real = await fs.promises.realpath(resolvedPath).catch(() => {
    throw new Error("Requested cwd does not exist.");
  });

  if (!isWithinRoot(root, real)) {
    throw new Error("Requested cwd is outside allowed workspace root.");
  }

  const relative = path.relative(root, real);
  return {
    absolute: real,
    relative: relative ? relative.replace(/\\/g, "/") : "."
  };
}

function chooseFallbackController(runtime: ActorTerminalRuntime): void {
  if (runtime.controllerClientId && runtime.clients.has(runtime.controllerClientId)) {
    return;
  }
  runtime.controllerClientId = runtime.clients.keys().next().value ?? null;
}

export function getRuntimeSummaryByActor(actorId: string): RuntimeSummary | null {
  const runtime = runtimeByActor.get(actorId);
  if (!runtime) {
    return null;
  }
  return {
    actorId,
    activeSessionId: runtime.activeSessionId,
    controllerClientId: runtime.controllerClientId,
    attachedClients: getClientSummaries(runtime),
    sessions: getSessionSummaries(runtime)
  };
}

export function registerTerminalSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (socket, request) => {
    const authedReq = request as AuthedUpgradeRequest;
    const actorId = authedReq.authActorId;
    if (!actorId) {
      socket.close(1008, "Unauthorized");
      return;
    }

    const runtime = getOrCreateActorRuntime(actorId);
    if (runtime.detachTimer) {
      clearTimeout(runtime.detachTimer);
      runtime.detachTimer = null;
    }

    let currentClientId: string = randomUUID();
    const initialClient: AttachedClient = {
      clientId: currentClientId,
      socket,
      clientType: "unknown",
      deviceLabel: "Unknown device",
      lastSeenAt: new Date().toISOString()
    };
    runtime.clients.set(currentClientId, initialClient);
    chooseFallbackController(runtime);

    const createSession = async (cwdRaw?: string, cols?: number, rows?: number) => {
      try {
        assertContainerRuntime();
        const preferred = cwdRaw && cwdRaw.trim() ? cwdRaw : getPreferredCwd(runtime.actorId);
        const cwd = await resolveWorkspaceCwd(preferred);
        const shell = resolveShell();
        const toolBinPath = "/workspace/.tools/npm/bin";
        const envPath = process.env.PATH ?? "";
        const mergedPath = envPath.includes(toolBinPath) ? envPath : `${toolBinPath}:${envPath}`;

        const sessionId = randomUUID();
        const now = new Date().toISOString();
        const term = pty.spawn(shell.file, shell.args, {
          name: "xterm-color",
          cols: Math.max(20, Number(cols) || 120),
          rows: Math.max(8, Number(rows) || 32),
          cwd: cwd.absolute,
          env: {
            ...process.env,
            PATH: mergedPath
          }
        });

        runtime.sessions.set(sessionId, {
          term,
          cwd: cwd.relative,
          absoluteCwd: cwd.absolute,
          status: "running",
          createdAt: now,
          lastActivityAt: now,
          lastSnapshotAt: now,
          title: relativeTitle(cwd.relative),
          outputBuffer: ""
        });
        runtime.activeSessionId = sessionId;

        updateActorContinuity(runtime, {
          lastSessionId: sessionId,
          lastCwd: cwd.relative,
          lastClientType: runtime.clients.get(currentClientId)?.clientType ?? "unknown"
        });
        syncSessionState(runtime, sessionId);

        term.onData((data) => {
          const session = runtime.sessions.get(sessionId);
          if (!session) {
            return;
          }
          session.lastActivityAt = new Date().toISOString();
          appendOutputBuffer(session, data);
          maybeSyncSessionState(runtime, sessionId);
          broadcast(runtime, { type: "output", sessionId, data });
        });

        term.onExit(({ exitCode }) => {
          const session = runtime.sessions.get(sessionId);
          if (!session) {
            return;
          }
          session.status = "stopped";
          session.lastActivityAt = new Date().toISOString();
          syncSessionState(runtime, sessionId);
          broadcast(runtime, { type: "status", sessionId, status: "stopped", exitCode });
          sendSessionList(runtime);
        });

        broadcast(runtime, { type: "status", sessionId, status: "started", cwd: cwd.relative });
        sendSessionList(runtime);
        term.write("\r");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Terminal start failed.";
        sendToSocket(socket, { type: "status", status: "error", message, sessionId: null });
      }
    };

    sendSessionList(runtime);
    sendControlChanged(runtime);
    if (runtime.activeSessionId) {
      broadcast(runtime, { type: "status", sessionId: runtime.activeSessionId, status: "switched" });
    }

    socket.on("message", async (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        sendToSocket(socket, { type: "status", status: "error", message: "Invalid JSON message." });
        return;
      }

      const client = touchClient(runtime, currentClientId);
      if (!client) {
        return;
      }

      if (message.type === "hello") {
        const nextClientId = message.clientId?.trim() || currentClientId;
        if (nextClientId !== currentClientId && !runtime.clients.has(nextClientId)) {
          const previousClientId = currentClientId;
          runtime.clients.delete(currentClientId);
          currentClientId = nextClientId;
          runtime.clients.set(currentClientId, { ...client, clientId: currentClientId, socket });
          if (runtime.controllerClientId === previousClientId) {
            runtime.controllerClientId = currentClientId;
          }
        }

        const activeClient = runtime.clients.get(currentClientId);
        if (activeClient) {
          activeClient.clientType = message.clientType ?? activeClient.clientType;
          activeClient.deviceLabel = message.deviceLabel?.trim() || activeClient.deviceLabel;
          activeClient.lastSeenAt = new Date().toISOString();
        }

        if (!runtime.controllerClientId) {
          runtime.controllerClientId = currentClientId;
        }

        updateActorContinuity(runtime, {
          lastSessionId: message.resumeSessionId ?? runtime.activeSessionId,
          lastCwd: message.preferredCwd,
          lastClientType: activeClient?.clientType ?? "unknown"
        });

        if (message.resumeSessionId && runtime.sessions.has(message.resumeSessionId)) {
          runtime.activeSessionId = message.resumeSessionId;
        }

        sendSessionList(runtime);
        sendBufferSnapshot(socket, runtime, runtime.activeSessionId);
        sendControlChanged(runtime);
        return;
      }

      if (message.type === "create_session") {
        await createSession(message.cwd, message.cols, message.rows);
        return;
      }

      if (message.type === "switch_session") {
        if (!runtime.sessions.has(message.sessionId)) {
          sendToSocket(socket, { type: "status", status: "error", message: "Session not found.", sessionId: null });
          return;
        }
        runtime.activeSessionId = message.sessionId;
        const session = runtime.sessions.get(message.sessionId);
        updateActorContinuity(runtime, {
          lastSessionId: message.sessionId,
          lastCwd: session?.cwd ?? null,
          lastClientType: client.clientType
        });
        sendSessionList(runtime);
        sendBufferSnapshot(socket, runtime, message.sessionId);
        broadcast(runtime, { type: "status", sessionId: runtime.activeSessionId, status: "switched" });
        return;
      }

      if (message.type === "resume_session") {
        if (!runtime.sessions.has(message.sessionId)) {
          sendToSocket(socket, {
            type: "session_resume_result",
            ok: false,
            sessionId: message.sessionId,
            reason: "session_missing"
          });
          return;
        }
        runtime.activeSessionId = message.sessionId;
        const session = runtime.sessions.get(message.sessionId);
        updateActorContinuity(runtime, {
          lastSessionId: message.sessionId,
          lastCwd: session?.cwd ?? null,
          lastClientType: client.clientType
        });
        sendSessionList(runtime);
        sendToSocket(socket, { type: "session_resume_result", ok: true, sessionId: message.sessionId });
        sendBufferSnapshot(socket, runtime, message.sessionId);
        broadcast(runtime, { type: "status", sessionId: runtime.activeSessionId, status: "switched" });
        return;
      }

      if (message.type === "request_control") {
        runtime.controllerClientId = currentClientId;
        sendControlChanged(runtime);
        sendRuntimeState(runtime);
        return;
      }

      if (message.type === "release_control") {
        if (runtime.controllerClientId === currentClientId) {
          runtime.controllerClientId = null;
          chooseFallbackController(runtime);
        }
        sendControlChanged(runtime);
        sendRuntimeState(runtime);
        return;
      }

      if (message.type === "close_session") {
        const session = runtime.sessions.get(message.sessionId);
        if (!session) {
          return;
        }
        runtime.sessions.delete(message.sessionId);
        session.term.kill();
        closeSessionSnapshot(runtime.actorId, message.sessionId);
        if (runtime.activeSessionId === message.sessionId) {
          runtime.activeSessionId = runtime.sessions.keys().next().value ?? null;
        }
        updateActorContinuity(runtime, {
          lastSessionId: runtime.activeSessionId,
          lastCwd: runtime.activeSessionId ? runtime.sessions.get(runtime.activeSessionId)?.cwd ?? null : session.cwd,
          lastClientType: client.clientType
        });
        broadcast(runtime, { type: "session_closed", sessionId: message.sessionId });
        sendSessionList(runtime);
        if (runtime.activeSessionId) {
          broadcast(runtime, { type: "status", sessionId: runtime.activeSessionId, status: "switched" });
        }
        return;
      }

      if (message.type === "list_sessions") {
        sendSessionList(runtime);
        sendControlChanged(runtime);
        return;
      }

      if (message.type === "input") {
        if (runtime.controllerClientId !== currentClientId) {
          sendToSocket(socket, {
            type: "status",
            status: "error",
            message: "Input locked to another device. Request control first.",
            sessionId: runtime.activeSessionId
          });
          sendRuntimeState(runtime);
          return;
        }
        const sid = resolveSessionId(runtime, message.sessionId);
        if (sid) {
          const session = runtime.sessions.get(sid);
          if (!session) {
            return;
          }
          session.lastActivityAt = new Date().toISOString();
          session.term.write(message.data);
          syncSessionState(runtime, sid);
          updateActorContinuity(runtime, {
            lastSessionId: sid,
            lastCwd: session.cwd,
            lastClientType: client.clientType
          });
        }
        return;
      }

      if (message.type === "resize") {
        const sid = resolveSessionId(runtime, message.sessionId);
        if (sid) {
          const term = runtime.sessions.get(sid)?.term;
          if (!term) {
            return;
          }
          const cols = Math.max(20, Number(message.cols) || 120);
          const rows = Math.max(8, Number(message.rows) || 32);
          term.resize(cols, rows);
        }
      }
    });

    socket.on("close", () => {
      runtime.clients.delete(currentClientId);
      if (runtime.controllerClientId === currentClientId) {
        runtime.controllerClientId = null;
        chooseFallbackController(runtime);
      }
      sendControlChanged(runtime);
      sendRuntimeState(runtime);
      if (runtime.clients.size === 0) {
        scheduleRuntimeCleanup(runtime);
      }
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "", "http://localhost");
    if (url.pathname !== "/ws/terminal") {
      return;
    }

    const ip = getClientIp(request);
    const allowedByRate = connectLimiter.allow(
      `ws-terminal:${ip}`,
      Math.max(1, config.wsConnectRateLimitPerMin),
      60_000
    );
    if (!allowedByRate) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
      socket.destroy();
      return;
    }

    const session = authService.resolveSessionFromRequest(request);
    if (!session) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    (request as AuthedUpgradeRequest).authActorId = session.actorId;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
}

function assertContainerRuntime(): void {
  if (process.env.ALLOW_HOST_EXECUTION === "1") {
    return;
  }
  if (!fs.existsSync("/.dockerenv")) {
    throw new Error("Terminal start blocked: runner must execute inside container sandbox.");
  }
}

function resolveShell(): { file: string; args: string[] } {
  if (process.platform === "win32" && process.env.ALLOW_HOST_EXECUTION === "1") {
    const powershellPath = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
    if (fs.existsSync(powershellPath)) {
      return { file: powershellPath, args: ["-NoLogo", "-NoExit"] };
    }
    const comSpec = process.env.ComSpec ?? "cmd.exe";
    return { file: comSpec, args: [] };
  }

  if (fs.existsSync("/bin/bash")) {
    return { file: "/bin/bash", args: ["-i"] };
  }
  return { file: "/bin/sh", args: ["-i"] };
}

function isWithinRoot(root: string, target: string): boolean {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}

export function forceRuntimeSessionsOffline(actorId: string): void {
  const runtime = runtimeByActor.get(actorId);
  if (!runtime) {
    markAllRuntimeSessionsOffline(actorId);
    return;
  }
  for (const sessionId of runtime.sessions.keys()) {
    setSnapshotRuntimeAlive(actorId, sessionId, false);
  }
}
