import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { db } from "../db/client.js";
import type {
  ExecutionLogRecord,
  ExecutionRecord,
  ExecutionStatus
} from "../types.js";

interface CreateExecutionInput {
  command: string;
  cwd?: string;
  createdBy?: string;
}

interface ExecutionEventPayload {
  executionId: string;
  stream: "stdout" | "stderr" | "system";
  chunk: string;
  createdAt: string;
}

export class ExecutionService extends EventEmitter {
  createExecution(input: CreateExecutionInput): ExecutionRecord {
    const now = new Date().toISOString();
    const row: ExecutionRecord = {
      id: randomUUID(),
      command: input.command,
      cwd: input.cwd ?? null,
      status: "running",
      exitCode: null,
      startedAt: now,
      finishedAt: null,
      createdBy: input.createdBy ?? "admin"
    };

    db.prepare(
      `INSERT INTO executions (id, command, cwd, status, exit_code, started_at, finished_at, created_by)
       VALUES (@id, @command, @cwd, @status, @exitCode, @startedAt, @finishedAt, @createdBy)`
    ).run(row);

    return row;
  }

  listExecutions(limit = 50): ExecutionRecord[] {
    const rows = db
      .prepare(
        `SELECT id, command, cwd, status, exit_code AS exitCode, started_at AS startedAt,
                finished_at AS finishedAt, created_by AS createdBy
         FROM executions
         ORDER BY started_at DESC
         LIMIT ?`
      )
      .all(limit) as ExecutionRecord[];

    return rows;
  }

  getExecution(executionId: string): ExecutionRecord | null {
    const row = db
      .prepare(
        `SELECT id, command, cwd, status, exit_code AS exitCode, started_at AS startedAt,
                finished_at AS finishedAt, created_by AS createdBy
         FROM executions
         WHERE id = ?`
      )
      .get(executionId) as ExecutionRecord | undefined;

    return row ?? null;
  }

  getExecutionLogs(executionId: string): ExecutionLogRecord[] {
    return db
      .prepare(
        `SELECT id, execution_id AS executionId, stream, chunk, created_at AS createdAt
         FROM execution_logs
         WHERE execution_id = ?
         ORDER BY created_at ASC`
      )
      .all(executionId) as ExecutionLogRecord[];
  }

  appendLog(
    executionId: string,
    stream: "stdout" | "stderr" | "system",
    chunk: string
  ): ExecutionLogRecord {
    const row: ExecutionLogRecord = {
      id: randomUUID(),
      executionId,
      stream,
      chunk,
      createdAt: new Date().toISOString()
    };

    db.prepare(
      `INSERT INTO execution_logs (id, execution_id, stream, chunk, created_at)
       VALUES (@id, @executionId, @stream, @chunk, @createdAt)`
    ).run(row);

    const payload: ExecutionEventPayload = {
      executionId: row.executionId,
      stream: row.stream,
      chunk: row.chunk,
      createdAt: row.createdAt
    };
    this.emit(`execution:${executionId}:log`, payload);

    return row;
  }

  completeExecution(
    executionId: string,
    status: Exclude<ExecutionStatus, "running">,
    exitCode: number
  ): void {
    const finishedAt = new Date().toISOString();

    db.prepare(
      `UPDATE executions
       SET status = @status, exit_code = @exitCode, finished_at = @finishedAt
       WHERE id = @executionId`
    ).run({
      executionId,
      status,
      exitCode,
      finishedAt
    });

    this.emit(`execution:${executionId}:status`, {
      executionId,
      status,
      exitCode,
      finishedAt
    });
  }

  appendAuditEvent(action: string, resource: string, metadata?: object): void {
    db.prepare(
      `INSERT INTO audit_events (id, action, resource, metadata_json, created_at)
       VALUES (@id, @action, @resource, @metadataJson, @createdAt)`
    ).run({
      id: randomUUID(),
      action,
      resource,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date().toISOString()
    });
  }
}

export const executionService = new ExecutionService();
