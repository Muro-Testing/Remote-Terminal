import type { Server as HttpServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { config } from "../config.js";
import { authService } from "../services/authService.js";
import { executionService } from "../services/executionService.js";
import { SlidingWindowRateLimiter } from "../services/rateLimit.js";

const connectLimiter = new SlidingWindowRateLimiter();

function getClientIp(request: import("node:http").IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = value?.split(",")[0]?.trim() ?? request.socket.remoteAddress ?? "unknown";
  return ip || "unknown";
}

export function registerExecutionSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  const handleExecutionSocket = (socket: WebSocket, executionId: string) => {
    const onLog = (payload: {
      executionId: string;
      stream: "stdout" | "stderr" | "system";
      chunk: string;
      createdAt: string;
    }) => {
      socket.send(
        JSON.stringify({
          type: "output",
          stream: payload.stream,
          data: payload.chunk,
          createdAt: payload.createdAt
        })
      );
    };

    const onStatus = (payload: {
      executionId: string;
      status: "completed" | "failed";
      exitCode: number;
      finishedAt: string;
    }) => {
      socket.send(
        JSON.stringify({
          type: "status",
          status: payload.status,
          exitCode: payload.exitCode,
          finishedAt: payload.finishedAt
        })
      );
    };

    executionService.on(`execution:${executionId}:log`, onLog);
    executionService.on(`execution:${executionId}:status`, onStatus);

    socket.send(
      JSON.stringify({
        type: "status",
        status: "subscribed",
        executionId
      })
    );

    socket.on("close", () => {
      executionService.off(`execution:${executionId}:log`, onLog);
      executionService.off(`execution:${executionId}:status`, onStatus);
    });
  };

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const match = url.pathname.match(/^\/ws\/executions\/([^/]+)$/);
    const executionId = match?.[1];

    if (!executionId) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid websocket path. Use /ws/executions/:id."
        })
      );
      socket.close();
      return;
    }

    handleExecutionSocket(socket, executionId);
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "", "http://localhost");
    if (!url.pathname.startsWith("/ws/executions/")) {
      return;
    }

    const ip = getClientIp(request);
    const allowedByRate = connectLimiter.allow(
      `ws-exec:${ip}`,
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

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
}
