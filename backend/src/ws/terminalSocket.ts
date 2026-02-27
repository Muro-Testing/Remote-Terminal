import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import pty from "node-pty";
import { config } from "../config.js";
import { authService } from "../services/authService.js";
import { SlidingWindowRateLimiter } from "../services/rateLimit.js";

const connectLimiter = new SlidingWindowRateLimiter();

type AuthedUpgradeRequest = IncomingMessage & { authActorId?: string };

interface TerminalSessionRuntime {
  term: pty.IPty;
  cwd: string;
  status: "running" | "stopped";
}

interface ActorTerminalRuntime {
  actorId: string;
  sessions: Map<string, TerminalSessionRuntime>;
  activeSessionId: string | null;
  socket: WebSocket | null;
  detachTimer: NodeJS.Timeout | null;
}

function getClientIp(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = value?.split(",")[0]?.trim() ?? request.socket.remoteAddress ?? "unknown";
  return ip || "unknown";
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
  | CreateSessionMessage
  | SwitchSessionMessage
  | CloseSessionMessage
  | ListSessionsMessage
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
    socket: null,
    detachTimer: null
  };
  runtimeByActor.set(actorId, created);
  return created;
}

function sendToRuntime(runtime: ActorTerminalRuntime, payload: object): void {
  const socket = runtime.socket;
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function sendSessionList(runtime: ActorTerminalRuntime): void {
  sendToRuntime(runtime, {
    type: "session_list",
    sessions: Array.from(runtime.sessions.entries()).map(([id, session]) => ({
      id,
      cwd: session.cwd,
      status: session.status
    })),
    activeSessionId: runtime.activeSessionId
  });
}

function stopAllTerms(runtime: ActorTerminalRuntime): void {
  for (const { term } of runtime.sessions.values()) {
    term.kill();
  }
  runtime.sessions.clear();
  runtime.activeSessionId = null;
}

function scheduleRuntimeCleanup(runtime: ActorTerminalRuntime): void {
  if (runtime.detachTimer) {
    clearTimeout(runtime.detachTimer);
    runtime.detachTimer = null;
  }
  const graceMs = Math.max(1, config.terminalDetachGraceMinutes) * 60_000;
  runtime.detachTimer = setTimeout(() => {
    if (runtime.socket) {
      return;
    }
    stopAllTerms(runtime);
    runtimeByActor.delete(runtime.actorId);
  }, graceMs);
}

function attachSocket(runtime: ActorTerminalRuntime, socket: WebSocket): void {
  if (runtime.detachTimer) {
    clearTimeout(runtime.detachTimer);
    runtime.detachTimer = null;
  }
  if (runtime.socket && runtime.socket !== socket && runtime.socket.readyState === WebSocket.OPEN) {
    runtime.socket.close(1012, "Replaced by new client");
  }
  runtime.socket = socket;
}

function resolveSessionId(runtime: ActorTerminalRuntime, requestedId?: string): string | null {
  const sid = requestedId ?? runtime.activeSessionId;
  if (!sid || !runtime.sessions.has(sid)) {
    return null;
  }
  return sid;
}

export function registerTerminalSocket(server: import("node:http").Server): void {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (socket, request) => {
    const authedReq = request as AuthedUpgradeRequest;
    const actorId = authedReq.authActorId;
    if (!actorId) {
      socket.close(1008, "Unauthorized");
      return;
    }

    const runtime = getOrCreateActorRuntime(actorId);
    attachSocket(runtime, socket);

    const createSession = async (cwdRaw?: string, cols?: number, rows?: number) => {
      try {
        assertContainerRuntime();
        const cwd = await resolveCwd(cwdRaw);
        const shell = resolveShell();
        const toolBinPath = "/workspace/.tools/npm/bin";
        const envPath = process.env.PATH ?? "";
        const mergedPath = envPath.includes(toolBinPath)
          ? envPath
          : `${toolBinPath}:${envPath}`;

        const sessionId = randomUUID();
        const term = pty.spawn(shell.file, shell.args, {
          name: "xterm-color",
          cols: Math.max(20, Number(cols) || 120),
          rows: Math.max(8, Number(rows) || 32),
          cwd,
          env: {
            ...process.env,
            PATH: mergedPath
          }
        });

        runtime.sessions.set(sessionId, { term, cwd, status: "running" });
        runtime.activeSessionId = sessionId;

        term.onData((data) => {
          sendToRuntime(runtime, { type: "output", sessionId, data });
        });

        term.onExit(({ exitCode }) => {
          const session = runtime.sessions.get(sessionId);
          if (!session) {
            return;
          }
          session.status = "stopped";
          sendToRuntime(runtime, { type: "status", sessionId, status: "stopped", exitCode });
          sendSessionList(runtime);
        });

        sendToRuntime(runtime, { type: "status", sessionId, status: "started", cwd });
        sendSessionList(runtime);
        term.write("\r");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Terminal start failed.";
        sendToRuntime(runtime, { type: "status", status: "error", message, sessionId: null });
      }
    };

    sendSessionList(runtime);
    if (runtime.activeSessionId) {
      sendToRuntime(runtime, { type: "status", sessionId: runtime.activeSessionId, status: "switched" });
    }

    socket.on("message", async (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        sendToRuntime(runtime, { type: "status", status: "error", message: "Invalid JSON message." });
        return;
      }

      if (message.type === "create_session") {
        await createSession(message.cwd, message.cols, message.rows);
        return;
      }
      if (message.type === "switch_session") {
        if (!runtime.sessions.has(message.sessionId)) {
          sendToRuntime(runtime, { type: "status", status: "error", message: "Session not found.", sessionId: null });
          return;
        }
        runtime.activeSessionId = message.sessionId;
        sendSessionList(runtime);
        sendToRuntime(runtime, { type: "status", sessionId: runtime.activeSessionId, status: "switched" });
        return;
      }
      if (message.type === "close_session") {
        const session = runtime.sessions.get(message.sessionId);
        if (!session) {
          return;
        }
        runtime.sessions.delete(message.sessionId);
        session.term.kill();
        if (runtime.activeSessionId === message.sessionId) {
          runtime.activeSessionId = runtime.sessions.keys().next().value ?? null;
        }
        sendToRuntime(runtime, { type: "session_closed", sessionId: message.sessionId });
        sendSessionList(runtime);
        if (runtime.activeSessionId) {
          sendToRuntime(runtime, { type: "status", sessionId: runtime.activeSessionId, status: "switched" });
        }
        return;
      }
      if (message.type === "list_sessions") {
        sendSessionList(runtime);
        return;
      }
      if (message.type === "input") {
        const sid = resolveSessionId(runtime, message.sessionId);
        if (sid) {
          runtime.sessions.get(sid)?.term.write(message.data);
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
      if (runtime.socket === socket) {
        runtime.socket = null;
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

async function resolveCwd(cwdRaw?: string): Promise<string> {
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
  return real;
}

function isWithinRoot(root: string, target: string): boolean {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
  );
}
