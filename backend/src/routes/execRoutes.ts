import { Router } from "express";
import { z } from "zod";
import { executionRunner } from "../services/executionRunner.js";
import { executionService } from "../services/executionService.js";

const startExecutionSchema = z.object({
  command: z.string().min(1, "command is required"),
  cwd: z.string().min(1).optional()
});

export const execRoutes = Router();

execRoutes.post("/exec", async (req, res) => {
  const parsed = startExecutionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  const execution = executionService.createExecution({
    command: parsed.data.command,
    cwd: parsed.data.cwd,
    createdBy: req.actorId ?? "admin"
  });

  void executionRunner.start({
    executionId: execution.id,
    command: execution.command,
    cwd: execution.cwd
  });

  return res.status(202).json({
    executionId: execution.id,
    startedAt: execution.startedAt,
    status: execution.status
  });
});

execRoutes.get("/executions", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 50;
  const executions = executionService.listExecutions(safeLimit);
  return res.json({ executions });
});

execRoutes.get("/executions/:id", (req, res) => {
  const execution = executionService.getExecution(req.params.id);
  if (!execution) {
    return res.status(404).json({ error: "execution_not_found" });
  }

  const logs = executionService.getExecutionLogs(execution.id);
  return res.json({ execution, logs });
});
