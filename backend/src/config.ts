import path from "node:path";

export interface AppConfig {
  port: number;
  dataDir: string;
  dbPath: string;
  workspaceRoot: string;
  executionTimeoutMs: number;
  appPassword: string;
  appPasswordHash: string;
  sessionSecret: string;
  sessionTtlHours: number;
  loginRateLimitPerMin: number;
  wsConnectRateLimitPerMin: number;
  authCookieSecure: boolean;
  terminalDetachGraceMinutes: number;
}

const defaultDataDir = path.resolve(process.cwd(), "data");

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 8080),
  dataDir: process.env.DATA_DIR ?? defaultDataDir,
  dbPath: process.env.DB_PATH ?? path.join(defaultDataDir, "app.sqlite"),
  workspaceRoot: process.env.WORKSPACE_ROOT ?? "/workspace",
  executionTimeoutMs: Number(process.env.EXECUTION_TIMEOUT_MS ?? 30000),
  appPassword: process.env.APP_PASSWORD ?? "",
  appPasswordHash: process.env.APP_PASSWORD_HASH ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),
  loginRateLimitPerMin: Number(process.env.LOGIN_RATE_LIMIT_PER_MIN ?? 5),
  wsConnectRateLimitPerMin: Number(process.env.WS_CONNECT_RATE_LIMIT_PER_MIN ?? 60),
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === "1",
  terminalDetachGraceMinutes: Number(process.env.TERMINAL_DETACH_GRACE_MINUTES ?? 720)
};
