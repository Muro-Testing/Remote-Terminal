import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { config } from "../config.js";
import { executionService } from "./executionService.js";

export interface StartExecutionInput {
  executionId: string;
  command: string;
  cwd: string | null;
}

export interface ExecutionRunner {
  start(input: StartExecutionInput): Promise<void>;
}

class PlaceholderExecutionRunner implements ExecutionRunner {
  async start(input: StartExecutionInput): Promise<void> {
    let resolvedCwd: string;

    try {
      this.assertContainerRuntime();
      resolvedCwd = await this.resolveAndValidateCwd(input.cwd);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runner initialization error";
      executionService.appendLog(input.executionId, "system", message);
      executionService.completeExecution(input.executionId, "failed", 126);
      return;
    }

    executionService.appendAuditEvent("execution.started", "terminal", {
      executionId: input.executionId,
      cwd: resolvedCwd
    });

    const shell = fs.existsSync("/bin/bash") ? "/bin/bash" : "/bin/sh";
    const shellArg = shell.endsWith("bash") ? "-lc" : "-c";

    const child = spawn(shell, [shellArg, input.command], {
      cwd: resolvedCwd,
      env: {
        ...process.env,
        WORKSPACE_ROOT: config.workspaceRoot
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      executionService.appendLog(
        input.executionId,
        "system",
        `Execution timed out after ${config.executionTimeoutMs}ms.`
      );
    }, config.executionTimeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      executionService.appendLog(input.executionId, "stdout", chunk.toString("utf8"));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      executionService.appendLog(input.executionId, "stderr", chunk.toString("utf8"));
    });

    child.on("error", (error) => {
      executionService.appendLog(
        input.executionId,
        "system",
        `Execution process error: ${error.message}`
      );
      clearTimeout(timeoutHandle);
      executionService.completeExecution(input.executionId, "failed", 127);
      executionService.appendAuditEvent("execution.failed", "terminal", {
        executionId: input.executionId,
        reason: "spawn_error"
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      const exitCode = typeof code === "number" ? code : 1;
      const failed = timedOut || exitCode !== 0;
      executionService.completeExecution(
        input.executionId,
        failed ? "failed" : "completed",
        exitCode
      );
      executionService.appendAuditEvent(
        failed ? "execution.failed" : "execution.completed",
        "terminal",
        {
          executionId: input.executionId,
          exitCode,
          timedOut
        }
      );
    });
  }

  private assertContainerRuntime(): void {
    // Strong default: execution is blocked unless process runs in a container.
    if (process.env.ALLOW_HOST_EXECUTION === "1") {
      return;
    }

    const inDocker = fs.existsSync("/.dockerenv");
    if (!inDocker) {
      throw new Error(
        "Command execution blocked: runner must execute inside container sandbox."
      );
    }
  }

  private async resolveAndValidateCwd(cwd: string | null): Promise<string> {
    const requested = cwd && cwd.trim().length > 0 ? cwd : ".";
    if (requested.includes("\0")) {
      throw new Error("Invalid cwd path.");
    }

    const rootReal = await fs.promises.realpath(config.workspaceRoot);
    const basePath = path.resolve(rootReal, requested);
    const resolved = await fs.promises.realpath(basePath).catch(() => {
      throw new Error("Requested cwd does not exist.");
    });

    if (!this.isWithinRoot(rootReal, resolved)) {
      throw new Error("Requested cwd is outside allowed workspace root.");
    }

    return resolved;
  }

  private isWithinRoot(rootReal: string, targetReal: string): boolean {
    const normalizedRoot = path.resolve(rootReal);
    const normalizedTarget = path.resolve(targetReal);
    return (
      normalizedTarget === normalizedRoot ||
      normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
    );
  }
}

export const executionRunner: ExecutionRunner = new PlaceholderExecutionRunner();
