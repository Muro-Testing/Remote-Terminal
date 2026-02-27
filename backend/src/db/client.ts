import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

const schemaPath = path.resolve(process.cwd(), "src", "db", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);

db.pragma("journal_mode = WAL");
db.exec(schemaSql);
