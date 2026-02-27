import fs from "node:fs";
import path from "node:path";
import { executionService } from "./executionService.js";
import { getWorkspaceRootRealPath, resolveSafePath } from "./pathSafety.js";

const MAX_READ_BYTES = Number(process.env.MAX_READ_BYTES ?? 1024 * 1024);
const MAX_WRITE_BYTES = Number(process.env.MAX_WRITE_BYTES ?? 1024 * 1024);
const ZIP_MAX_BYTES = Number(process.env.MAX_ZIP_BYTES ?? 200 * 1024 * 1024);

export interface FileEntry {
  name: string;
  type: "file" | "dir";
  size: number;
  mtime: string;
}

export interface FileListResult {
  path: string;
  entries: FileEntry[];
}

interface ZipEntry {
  name: string;
  data: Buffer;
  crc32: number;
  mtime: Date;
}

export async function listDirectory(relativePath: string): Promise<FileListResult> {
  const absolutePath = await resolveSafePath(relativePath);
  const stats = await fs.promises.stat(absolutePath);

  if (!stats.isDirectory()) {
    throw new Error("Requested path is not a directory.");
  }

  const dirEntries = await fs.promises.readdir(absolutePath, { withFileTypes: true });
  const mappedEntries: FileEntry[] = [];

  for (const entry of dirEntries) {
    const entryPath = path.join(absolutePath, entry.name);
    const entryStats = await fs.promises.stat(entryPath);
    mappedEntries.push({
      name: entry.name,
      type: entry.isDirectory() ? "dir" : "file",
      size: entryStats.size,
      mtime: entryStats.mtime.toISOString()
    });
  }

  mappedEntries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const root = await getWorkspaceRootRealPath();
  const relative = path.relative(root, absolutePath);

  executionService.appendAuditEvent("file.list", "filesystem", {
    path: relative || "."
  });

  return {
    path: relative || ".",
    entries: mappedEntries
  };
}

export async function readFile(relativePath: string): Promise<{ content: string; encoding: "utf8" }> {
  const absolutePath = await resolveSafePath(relativePath);
  const stats = await fs.promises.stat(absolutePath);

  if (!stats.isFile()) {
    throw new Error("Requested path is not a file.");
  }

  if (stats.size > MAX_READ_BYTES) {
    throw new Error(`File exceeds max read size (${MAX_READ_BYTES} bytes).`);
  }

  const content = await fs.promises.readFile(absolutePath, "utf8");
  executionService.appendAuditEvent("file.read", "filesystem", {
    path: relativePath,
    bytes: Buffer.byteLength(content, "utf8")
  });

  return { content, encoding: "utf8" };
}

export async function writeFile(
  relativePath: string,
  content: string
): Promise<{ path: string; bytes: number }> {
  const absolutePath = await resolveSafePath(relativePath);
  const bytes = Buffer.byteLength(content, "utf8");

  if (bytes > MAX_WRITE_BYTES) {
    throw new Error(`Content exceeds max write size (${MAX_WRITE_BYTES} bytes).`);
  }

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, content, "utf8");

  executionService.appendAuditEvent("file.write", "filesystem", {
    path: relativePath,
    bytes
  });

  return { path: relativePath, bytes };
}

export async function createFolder(relativePath: string): Promise<{ path: string }> {
  const absolutePath = await resolveSafePath(relativePath);
  await fs.promises.mkdir(absolutePath, { recursive: true });

  executionService.appendAuditEvent("file.mkdir", "filesystem", {
    path: relativePath
  });

  return { path: relativePath };
}

export async function createEmptyFile(relativePath: string): Promise<{ path: string }> {
  const absolutePath = await resolveSafePath(relativePath);
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });

  const handle = await fs.promises.open(absolutePath, "a");
  await handle.close();

  executionService.appendAuditEvent("file.touch", "filesystem", {
    path: relativePath
  });

  return { path: relativePath };
}

export async function uploadFiles(
  relativeDirPath: string,
  files: Array<{ originalname: string; buffer: Buffer }>
): Promise<{ path: string; uploaded: string[] }> {
  const absolutePath = await resolveSafePath(relativeDirPath);
  const stats = await fs.promises.stat(absolutePath);
  if (!stats.isDirectory()) {
    throw new Error("Upload target path is not a directory.");
  }

  const uploaded: string[] = [];
  for (const file of files) {
    const fileName = path.basename(file.originalname);
    const targetPath = path.join(absolutePath, fileName);
    await fs.promises.writeFile(targetPath, file.buffer);
    uploaded.push(fileName);
  }

  executionService.appendAuditEvent("file.upload", "filesystem", {
    path: relativeDirPath,
    files: uploaded
  });

  return {
    path: relativeDirPath,
    uploaded
  };
}

export async function deletePath(
  relativePath: string,
  recursive = false
): Promise<{ path: string; deleted: true }> {
  const absolutePath = await resolveSafePath(relativePath);
  const stats = await fs.promises.stat(absolutePath).catch(() => {
    throw new Error("Path does not exist.");
  });

  if (stats.isDirectory()) {
    if (!recursive) {
      const entries = await fs.promises.readdir(absolutePath);
      if (entries.length > 0) {
        throw new Error("Directory is not empty. Use recursive delete.");
      }
    }
    await fs.promises.rm(absolutePath, { recursive, force: false });
  } else {
    await fs.promises.unlink(absolutePath);
  }

  executionService.appendAuditEvent("file.delete", "filesystem", {
    path: relativePath,
    recursive
  });

  return { path: relativePath, deleted: true };
}

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = buildCrc32Table();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i] ?? 0;
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = Math.min(12, Math.max(1, date.getMonth() + 1));
  const day = Math.min(31, Math.max(1, date.getDate()));
  const hour = Math.min(23, Math.max(0, date.getHours()));
  const minute = Math.min(59, Math.max(0, date.getMinutes()));
  const second = Math.min(59, Math.max(0, date.getSeconds()));
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = (hour << 11) | (minute << 5) | Math.floor(second / 2);
  return { dosDate, dosTime };
}

async function collectZipEntries(dirPath: string, basePath = ""): Promise<ZipEntry[]> {
  const dirEntries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const collected: ZipEntry[] = [];
  for (const entry of dirEntries) {
    const absolute = path.join(dirPath, entry.name);
    const zipName = path.posix.join(basePath, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectZipEntries(absolute, zipName);
      collected.push(...nested);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const stat = await fs.promises.stat(absolute);
    const data = await fs.promises.readFile(absolute);
    collected.push({
      name: zipName.replace(/\\/g, "/"),
      data,
      crc32: crc32(data),
      mtime: stat.mtime
    });
  }
  return collected;
}

function buildZipBuffer(entries: ZipEntry[]): Buffer {
  const fileParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const { dosDate, dosTime } = getDosDateTime(entry.mtime);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(entry.crc32, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    fileParts.push(localHeader, nameBuffer, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(entry.crc32, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, nameBuffer);
    offset += localHeader.length + nameBuffer.length + entry.data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...fileParts, ...centralParts, eocd]);
}

export async function buildDirectoryZip(relativeDirPath: string): Promise<{ fileName: string; buffer: Buffer }> {
  const absolutePath = await resolveSafePath(relativeDirPath);
  const stats = await fs.promises.stat(absolutePath).catch(() => {
    throw new Error("Path does not exist.");
  });
  if (!stats.isDirectory()) {
    throw new Error("Requested path is not a directory.");
  }
  const normalizedRelative = normalizePathForAudit(relativeDirPath);
  const entries = await collectZipEntries(absolutePath);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.data.length, 0);
  if (totalBytes > ZIP_MAX_BYTES) {
    throw new Error(`Folder exceeds zip size limit (${ZIP_MAX_BYTES} bytes).`);
  }
  const zipBuffer = buildZipBuffer(entries);
  executionService.appendAuditEvent("file.download_folder", "filesystem", {
    path: normalizedRelative,
    files: entries.length,
    bytes: zipBuffer.length
  });
  const baseName = path.basename(normalizedRelative === "." ? "workspace" : normalizedRelative) || "workspace";
  return { fileName: `${baseName}.zip`, buffer: zipBuffer };
}

function normalizePathForAudit(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/{2,}/g, "/");
  return normalized.replace(/^\/+|\/+$/g, "") || ".";
}
