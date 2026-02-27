import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { db } from "../db/client.js";
import { config } from "../config.js";
import { executionService } from "./executionService.js";

const SESSION_COOKIE_NAME = "rt_session";

interface SessionRow {
  id: string;
  token_hash: string;
  actor_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  ip_address: string | null;
  user_agent: string | null;
  revoked_at: string | null;
}

export interface SessionInfo {
  sessionId: string;
  actorId: string;
  expiresAt: string;
}

export interface SessionContext {
  actorId: string;
  sessionId: string;
}

export interface CreateSessionInput {
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function hashToken(input: string): string {
  return createHash("sha256")
    .update(config.sessionSecret)
    .update(":")
    .update(input)
    .digest("hex");
}

function hashPassword(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function parseCookies(headerValue: string | undefined): Record<string, string> {
  if (!headerValue) {
    return {};
  }
  const cookies: Record<string, string> = {};
  const pairs = headerValue.split(";");
  for (const part of pairs) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) {
      continue;
    }
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function addHours(isoTs: string, hours: number): string {
  const dt = new Date(isoTs);
  dt.setHours(dt.getHours() + hours);
  return dt.toISOString();
}

function safeEqualString(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(aa, bb);
}

class AuthService {
  verifyPassword(password: string): boolean {
    if (!password) {
      return false;
    }

    if (config.appPasswordHash) {
      const candidate = hashPassword(password);
      return safeEqualString(candidate, config.appPasswordHash);
    }

    if (!config.appPassword) {
      return false;
    }

    return safeEqualString(password, config.appPassword);
  }

  createSession(input: CreateSessionInput): { token: string; info: SessionInfo } {
    const now = new Date().toISOString();
    const expiresAt = addHours(now, config.sessionTtlHours);
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const id = randomUUID();

    db.prepare(
      `INSERT INTO sessions
         (id, token_hash, actor_id, created_at, expires_at, last_seen_at, ip_address, user_agent, revoked_at)
       VALUES
         (@id, @tokenHash, @actorId, @createdAt, @expiresAt, @lastSeenAt, @ipAddress, @userAgent, NULL)`
    ).run({
      id,
      tokenHash,
      actorId: input.actorId,
      createdAt: now,
      expiresAt,
      lastSeenAt: now,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null
    });

    executionService.appendAuditEvent("auth.login.success", "auth", {
      actorId: input.actorId,
      ipAddress: input.ipAddress ?? null
    });

    return {
      token,
      info: {
        sessionId: id,
        actorId: input.actorId,
        expiresAt
      }
    };
  }

  revokeSessionByToken(token: string): void {
    if (!token) {
      return;
    }
    const tokenHash = hashToken(token);
    db.prepare(
      `UPDATE sessions
       SET revoked_at = @revokedAt
       WHERE token_hash = @tokenHash AND revoked_at IS NULL`
    ).run({
      revokedAt: new Date().toISOString(),
      tokenHash
    });
    executionService.appendAuditEvent("auth.logout", "auth");
  }

  resolveSessionFromRequest(req: IncomingMessage): SessionContext | null {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME];
    if (!token) {
      return null;
    }
    return this.resolveSessionFromToken(token);
  }

  resolveSessionFromToken(token: string): SessionContext | null {
    const now = new Date().toISOString();
    const tokenHash = hashToken(token);
    const row = db
      .prepare(
        `SELECT id, token_hash, actor_id, created_at, expires_at, last_seen_at, ip_address, user_agent, revoked_at
         FROM sessions
         WHERE token_hash = ?`
      )
      .get(tokenHash) as SessionRow | undefined;

    if (!row) {
      return null;
    }

    if (row.revoked_at) {
      return null;
    }

    if (row.expires_at <= now) {
      db.prepare(
        `UPDATE sessions
         SET revoked_at = @revokedAt
         WHERE id = @id AND revoked_at IS NULL`
      ).run({
        id: row.id,
        revokedAt: now
      });
      return null;
    }

    const newExpiresAt = addHours(now, config.sessionTtlHours);
    db.prepare(
      `UPDATE sessions
       SET last_seen_at = @lastSeenAt, expires_at = @expiresAt
       WHERE id = @id`
    ).run({
      id: row.id,
      lastSeenAt: now,
      expiresAt: newExpiresAt
    });

    return {
      actorId: row.actor_id,
      sessionId: row.id
    };
  }

  getSessionCookieName(): string {
    return SESSION_COOKIE_NAME;
  }
}

export const authService = new AuthService();
