export type ExecutionStatus = "running" | "completed" | "failed";

export interface ExecutionRecord {
  id: string;
  command: string;
  cwd: string | null;
  status: ExecutionStatus;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  createdBy: string;
}

export interface ExecutionLogRecord {
  id: string;
  executionId: string;
  stream: "stdout" | "stderr" | "system";
  chunk: string;
  createdAt: string;
}
