import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { clearSessionCookie, setSessionCookie } from "../middleware/singleAdmin.js";
import { authService } from "../services/authService.js";
import { executionService } from "../services/executionService.js";
import { SlidingWindowRateLimiter } from "../services/rateLimit.js";

const loginSchema = z.object({
  password: z.string().min(1)
});

const loginLimiter = new SlidingWindowRateLimiter();

function getClientIp(input: string | undefined): string {
  if (!input) {
    return "unknown";
  }
  const first = input.split(",")[0]?.trim();
  return first || "unknown";
}

export const authRoutes = Router();

authRoutes.post("/auth/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ipAddress = getClientIp(forwardedIp ?? req.socket.remoteAddress ?? undefined);
  const allowed = loginLimiter.allow(
    ipAddress,
    Math.max(1, config.loginRateLimitPerMin),
    60_000
  );
  if (!allowed) {
    return res.status(429).json({
      error: "rate_limited",
      message: "Too many login attempts. Try again in a minute."
    });
  }

  const isValid = authService.verifyPassword(parsed.data.password);
  if (!isValid) {
    executionService.appendAuditEvent("auth.login.failed", "auth", { ipAddress });
    return res.status(401).json({
      error: "invalid_credentials",
      message: "Invalid password."
    });
  }

  const session = authService.createSession({
    actorId: "admin",
    ipAddress,
    userAgent: req.headers["user-agent"] ?? null
  });
  setSessionCookie(res, session.token);
  return res.json({
    ok: true,
    actorId: session.info.actorId,
    expiresAt: session.info.expiresAt
  });
});

authRoutes.post("/auth/logout", (req, res) => {
  const cookieHeader = req.headers.cookie ?? "";
  const sessionCookieName = authService.getSessionCookieName();
  const tokenPart = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));
  const token = tokenPart ? decodeURIComponent(tokenPart.split("=")[1] ?? "") : "";
  authService.revokeSessionByToken(token);
  clearSessionCookie(res);
  return res.json({ ok: true });
});

authRoutes.get("/auth/session", (req, res) => {
  if (!req.actorId || !req.sessionId) {
    return res.status(401).json({
      authenticated: false
    });
  }
  return res.json({
    authenticated: true,
    actorId: req.actorId
  });
});
