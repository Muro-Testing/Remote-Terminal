import http from "node:http";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import "./db/client.js";
import { attachAuthContext, requireAuth } from "./middleware/singleAdmin.js";
import { authRoutes } from "./routes/authRoutes.js";
import { execRoutes } from "./routes/execRoutes.js";
import { fileRoutes } from "./routes/fileRoutes.js";
import { networkRoutes } from "./routes/networkRoutes.js";
import { oauthRelayRoutes } from "./routes/oauthRelayRoutes.js";
import { projectRoutes } from "./routes/projectRoutes.js";
import { registerExecutionSocket } from "./ws/executionSocket.js";
import { registerTerminalSocket } from "./ws/terminalSocket.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(attachAuthContext);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", authRoutes);
app.use("/api", requireAuth);
app.use("/api", execRoutes);
app.use("/api", fileRoutes);
app.use("/api", networkRoutes);
app.use("/api", oauthRelayRoutes);
app.use("/api", projectRoutes);
app.use(express.static(path.resolve(process.cwd(), "public"), { index: false }));

app.get("/m", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "mobile", "index.html"));
});

app.get("/m/*", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "mobile", "index.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "mobile", "index.html"));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({
    error: "internal_error",
    message: err.message
  });
});

const server = http.createServer(app);
registerExecutionSocket(server);
registerTerminalSocket(server);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${config.port}`);
});
