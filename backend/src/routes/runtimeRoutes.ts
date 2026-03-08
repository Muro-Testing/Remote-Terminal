import { Router } from "express";
import { z } from "zod";
import { buildRuntimeState, getActorState, getPreferredCwd, upsertActorState } from "../services/continuityService.js";
import { getRuntimeSummaryByActor } from "../ws/terminalSocket.js";

const preferenceSchema = z.object({
  autoResumeMode: z.enum(["live_or_context", "context_only", "manual"]).optional(),
  lastClientType: z.enum(["desktop", "mobile", "unknown"]).optional()
});

export const runtimeRoutes = Router();

runtimeRoutes.get("/runtime/state", (req, res) => {
  const actorId = req.actorId ?? "admin";
  const runtime = getRuntimeSummaryByActor(actorId);
  const state = buildRuntimeState({
    actorId,
    runtimeAlive: Boolean(runtime && runtime.sessions.length > 0),
    activeSessionId: runtime?.activeSessionId ?? getActorState(actorId)?.lastSessionId ?? null,
    attachedClients: runtime?.attachedClients ?? [],
    controllerClientId: runtime?.controllerClientId ?? null
  });
  return res.json(state);
});

runtimeRoutes.post("/runtime/preferences", (req, res) => {
  const parsed = preferenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  const actorId = req.actorId ?? "admin";
  const updated = upsertActorState({
    actorId,
    autoResumeMode: parsed.data.autoResumeMode,
    lastClientType: parsed.data.lastClientType
  });
  return res.json({ ok: true, actorState: updated });
});

runtimeRoutes.post("/runtime/recover", (req, res) => {
  const actorId = req.actorId ?? "admin";
  const cwd = getPreferredCwd(actorId);
  const updated = upsertActorState({ actorId, lastCwd: cwd });
  return res.json({ ok: true, cwd, actorState: updated });
});
