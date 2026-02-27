import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  buildDirectoryZip,
  createEmptyFile,
  createFolder,
  deletePath,
  listDirectory,
  readFile,
  uploadFiles,
  writeFile
} from "../services/fileService.js";
import { resolveSafePath } from "../services/pathSafety.js";

const listSchema = z.object({
  path: z.string().optional().default(".")
});

const readSchema = z.object({
  path: z.string().min(1)
});

const writeSchema = z.object({
  path: z.string().min(1),
  content: z.string()
});

const mkdirSchema = z.object({
  path: z.string().min(1)
});

const touchSchema = z.object({
  path: z.string().min(1)
});

const deleteSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional().default(false)
});

export const fileRoutes = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024
  }
});

fileRoutes.get("/files", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await listDirectory(parsed.data.path);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list directory.";
    return res.status(400).json({ error: "file_list_failed", message });
  }
});

fileRoutes.post("/files/read", async (req, res) => {
  const parsed = readSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await readFile(parsed.data.path);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read file.";
    return res.status(400).json({ error: "file_read_failed", message });
  }
});

fileRoutes.post("/files/write", async (req, res) => {
  const parsed = writeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await writeFile(parsed.data.path, parsed.data.content);
    return res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to write file.";
    return res.status(400).json({ error: "file_write_failed", message });
  }
});

fileRoutes.post("/files/mkdir", async (req, res) => {
  const parsed = mkdirSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await createFolder(parsed.data.path);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create folder.";
    return res.status(400).json({ error: "file_mkdir_failed", message });
  }
});

fileRoutes.post("/files/touch", async (req, res) => {
  const parsed = touchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await createEmptyFile(parsed.data.path);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create file.";
    return res.status(400).json({ error: "file_touch_failed", message });
  }
});

fileRoutes.post("/files/upload", upload.array("files"), async (req, res) => {
  const relativePathRaw = typeof req.query.path === "string" ? req.query.path : ".";
  const parsed = listSchema.safeParse({ path: relativePathRaw });
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: "invalid_request", message: "No files provided." });
  }

  try {
    const result = await uploadFiles(parsed.data.path, files);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload files.";
    return res.status(400).json({ error: "file_upload_failed", message });
  }
});

fileRoutes.get("/files/download", async (req, res) => {
  const relativePathRaw = typeof req.query.path === "string" ? req.query.path : "";
  const parsed = readSchema.safeParse({ path: relativePathRaw });
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const absolutePath = await resolveSafePath(parsed.data.path);
    return res.download(absolutePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to download file.";
    return res.status(400).json({ error: "file_download_failed", message });
  }
});

fileRoutes.get("/files/download-folder", async (req, res) => {
  const relativePathRaw = typeof req.query.path === "string" ? req.query.path : "";
  const parsed = readSchema.safeParse({ path: relativePathRaw });
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const { fileName, buffer } = await buildDirectoryZip(parsed.data.path);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    return res.status(200).send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to download folder.";
    if (/does not exist|not a directory/i.test(message)) {
      return res.status(404).json({ error: "file_download_failed", message });
    }
    return res.status(400).json({ error: "file_download_failed", message });
  }
});

fileRoutes.post("/files/delete", async (req, res) => {
  const parsed = deleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await deletePath(parsed.data.path, parsed.data.recursive);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete path.";
    return res.status(400).json({ error: "file_delete_failed", message });
  }
});
