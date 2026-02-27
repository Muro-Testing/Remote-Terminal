import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

export async function getWorkspaceRootRealPath(): Promise<string> {
  return fs.promises.realpath(config.workspaceRoot);
}

export function rejectNullByte(input: string): void {
  if (input.includes("\0")) {
    throw new Error("Path contains invalid null byte.");
  }
}

export async function resolveSafePath(relativePath: string): Promise<string> {
  rejectNullByte(relativePath);

  if (path.isAbsolute(relativePath)) {
    throw new Error("Absolute paths are not allowed.");
  }

  const root = await getWorkspaceRootRealPath();
  const candidate = path.resolve(root, relativePath);
  const normalized = path.normalize(candidate);

  if (!isWithinRoot(root, normalized)) {
    throw new Error("Path escapes workspace root.");
  }

  return normalized;
}

export function isWithinRoot(root: string, target: string): boolean {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
  );
}
