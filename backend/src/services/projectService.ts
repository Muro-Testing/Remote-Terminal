import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { db } from "../db/client.js";
import { config } from "../config.js";
import { executionService } from "./executionService.js";
import { isWithinRoot } from "./pathSafety.js";

interface ProjectRow {
  id: string;
  name: string;
  repo_url: string;
  branch: string | null;
  local_path: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  repoUrl: string;
  branch: string | null;
  localPath: string;
  createdAt: string;
  updatedAt: string;
}

interface CloneProjectInput {
  repoUrl: string;
  branch?: string;
  folderName?: string;
}

function normalizeProjectName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Project name cannot be empty.");
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    throw new Error("Project name can contain only letters, numbers, dot, dash and underscore.");
  }
  return trimmed;
}

function inferProjectName(repoUrl: string): string {
  const cleaned = repoUrl.trim().replace(/\/+$/, "");
  const lastPart = cleaned.split("/").pop() ?? "";
  const withoutGit = lastPart.endsWith(".git") ? lastPart.slice(0, -4) : lastPart;
  return normalizeProjectName(withoutGit || "project");
}

async function runGit(args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `git ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

function mapProjectRow(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    repoUrl: row.repo_url,
    branch: row.branch,
    localPath: row.local_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getProjectsRoot(): string {
  return path.resolve(config.workspaceRoot, "projects");
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const rows = db
    .prepare(
      `SELECT id, name, repo_url, branch, local_path, created_at, updated_at
       FROM projects
       ORDER BY updated_at DESC`
    )
    .all() as ProjectRow[];
  return rows.map(mapProjectRow);
}

export async function cloneProject(input: CloneProjectInput): Promise<ProjectRecord> {
  const repoUrl = input.repoUrl.trim();
  if (!repoUrl) {
    throw new Error("Repository URL is required.");
  }
  const projectName = input.folderName ? normalizeProjectName(input.folderName) : inferProjectName(repoUrl);
  const now = new Date().toISOString();
  const projectsRoot = getProjectsRoot();
  const localPath = path.resolve(projectsRoot, projectName);
  const workspaceRoot = path.resolve(config.workspaceRoot);

  if (!isWithinRoot(workspaceRoot, localPath)) {
    throw new Error("Resolved project path is outside workspace root.");
  }

  await fs.promises.mkdir(projectsRoot, { recursive: true });

  const exists = await fs.promises
    .access(localPath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
  if (exists) {
    throw new Error("Target project folder already exists.");
  }

  const gitArgs = ["clone"];
  if (input.branch && input.branch.trim()) {
    gitArgs.push("--branch", input.branch.trim());
  }
  gitArgs.push(repoUrl, localPath);
  await runGit(gitArgs, workspaceRoot);

  const row: ProjectRow = {
    id: randomUUID(),
    name: projectName,
    repo_url: repoUrl,
    branch: input.branch?.trim() || null,
    local_path: localPath,
    created_at: now,
    updated_at: now
  };

  db.prepare(
    `INSERT INTO projects (id, name, repo_url, branch, local_path, created_at, updated_at)
     VALUES (@id, @name, @repo_url, @branch, @local_path, @created_at, @updated_at)`
  ).run(row);

  executionService.appendAuditEvent("project.clone", "project", {
    projectId: row.id,
    name: row.name,
    repoUrl: row.repo_url
  });

  return mapProjectRow(row);
}

export async function pullProject(projectId: string): Promise<ProjectRecord> {
  const row = db
    .prepare(
      `SELECT id, name, repo_url, branch, local_path, created_at, updated_at
       FROM projects
       WHERE id = ?`
    )
    .get(projectId) as ProjectRow | undefined;
  if (!row) {
    throw new Error("Project not found.");
  }

  await runGit(["pull", "--ff-only"], row.local_path);
  const updatedAt = new Date().toISOString();
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(updatedAt, row.id);

  executionService.appendAuditEvent("project.pull", "project", {
    projectId: row.id,
    name: row.name
  });

  return {
    ...mapProjectRow(row),
    updatedAt
  };
}

export function openProject(projectId: string): { project: ProjectRecord; cwd: string } {
  const row = db
    .prepare(
      `SELECT id, name, repo_url, branch, local_path, created_at, updated_at
       FROM projects
       WHERE id = ?`
    )
    .get(projectId) as ProjectRow | undefined;
  if (!row) {
    throw new Error("Project not found.");
  }

  const relativeCwd = path.relative(path.resolve(config.workspaceRoot), row.local_path) || ".";

  db.prepare(
    `INSERT INTO app_settings (key, value)
     VALUES ('default_project_path', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(relativeCwd);

  executionService.appendAuditEvent("project.open", "project", {
    projectId: row.id,
    name: row.name
  });

  return {
    project: mapProjectRow(row),
    cwd: relativeCwd
  };
}

export function getDefaultProjectPath(): string | null {
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = 'default_project_path'")
    .get() as { value: string | null } | undefined;
  return row?.value ?? null;
}
