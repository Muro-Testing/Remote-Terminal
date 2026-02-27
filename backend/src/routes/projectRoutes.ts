import { Router } from "express";
import { z } from "zod";
import {
  cloneProject,
  getDefaultProjectPath,
  listProjects,
  openProject,
  pullProject
} from "../services/projectService.js";

const cloneSchema = z.object({
  repoUrl: z.string().min(1),
  branch: z.string().optional(),
  folderName: z.string().optional()
});

const pullSchema = z.object({
  projectId: z.string().uuid()
});

const openSchema = z.object({
  projectId: z.string().uuid()
});

export const projectRoutes = Router();

projectRoutes.get("/projects", async (_req, res) => {
  try {
    const projects = await listProjects();
    return res.json({
      projects,
      defaultCwd: getDefaultProjectPath()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list projects.";
    return res.status(400).json({ error: "projects_list_failed", message });
  }
});

projectRoutes.post("/projects/clone", async (req, res) => {
  const parsed = cloneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }
  try {
    const project = await cloneProject(parsed.data);
    return res.json({ ok: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to clone project.";
    return res.status(400).json({ error: "project_clone_failed", message });
  }
});

projectRoutes.post("/projects/pull", async (req, res) => {
  const parsed = pullSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }
  try {
    const project = await pullProject(parsed.data.projectId);
    return res.json({ ok: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to pull project.";
    return res.status(400).json({ error: "project_pull_failed", message });
  }
});

projectRoutes.post("/projects/open", (req, res) => {
  const parsed = openSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }
  try {
    const result = openProject(parsed.data.projectId);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open project.";
    return res.status(400).json({ error: "project_open_failed", message });
  }
});
