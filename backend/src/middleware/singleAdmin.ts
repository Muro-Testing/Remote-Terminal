import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { authService } from "../services/authService.js";

declare module "express-serve-static-core" {
  interface Request {
    actorId?: string;
    sessionId?: string;
  }
}

export function attachAuthContext(req: Request, _res: Response, next: NextFunction): void {
  const context = authService.resolveSessionFromRequest(req);
  if (context) {
    req.actorId = context.actorId;
    req.sessionId = context.sessionId;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.actorId || !req.sessionId) {
    res.status(401).json({
      error: "unauthorized",
      message: "Login required."
    });
    return;
  }
  next();
}

export function setSessionCookie(res: Response, token: string): void {
  const maxAge = Math.max(1, config.sessionTtlHours) * 60 * 60;
  const secure = config.authCookieSecure ? " Secure;" : "";
  const cookie = `${authService.getSessionCookieName()}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure}`;
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res: Response): void {
  const secure = config.authCookieSecure ? " Secure;" : "";
  const cookie = `${authService.getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure}`;
  res.setHeader("Set-Cookie", cookie);
}
