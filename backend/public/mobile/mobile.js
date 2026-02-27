const els = {
  drawerToggleButton: document.getElementById("drawerToggleButton"),
  closeDrawerButton: document.getElementById("closeDrawerButton"),
  mobileDrawer: document.getElementById("mobileDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerItems: Array.from(document.querySelectorAll(".drawer-item")),
  scenes: {
    terminal: document.getElementById("sceneTerminal"),
    files: document.getElementById("sceneFiles"),
    access: document.getElementById("sceneAccess"),
    settings: document.getElementById("sceneSettings")
  },
  installAppButton: document.getElementById("installAppButton"),
  mConnectionLabel: document.getElementById("mConnectionLabel"),
  terminalStatusBadge: document.getElementById("terminalStatusBadge"),
  terminalSessionLabel: document.getElementById("terminalSessionLabel"),
  terminalFolderSelect: document.getElementById("terminalFolderSelect"),
  createTerminalFolderButton: document.getElementById("createTerminalFolderButton"),
  connectTerminalButton: document.getElementById("connectTerminalButton"),
  reconnectTerminalButton: document.getElementById("reconnectTerminalButton"),
  resumeSessionButton: document.getElementById("resumeSessionButton"),
  toggleScrollModeButton: document.getElementById("toggleScrollModeButton"),
  terminalViewport: document.getElementById("terminalViewport"),
  openSessionsButton: document.getElementById("openSessionsButton"),
  openHandoffButton: document.getElementById("openHandoffButton"),
  toggleKeysButton: document.getElementById("toggleKeysButton"),
  openMoreButton: document.getElementById("openMoreButton"),
  terminalKeys: document.getElementById("terminalKeys"),
  sessionsSheet: document.getElementById("sessionsSheet"),
  closeSessionsButton: document.getElementById("closeSessionsButton"),
  sessionsList: document.getElementById("sessionsList"),
  newSessionButton: document.getElementById("newSessionButton"),
  newSessionHereButton: document.getElementById("newSessionHereButton"),
  closeActiveSessionButton: document.getElementById("closeActiveSessionButton"),
  moreSheet: document.getElementById("moreSheet"),
  closeMoreButton: document.getElementById("closeMoreButton"),
  keysSheet: document.getElementById("keysSheet"),
  closeKeysButton: document.getElementById("closeKeysButton"),
  handoffSheet: document.getElementById("handoffSheet"),
  closeHandoffButton: document.getElementById("closeHandoffButton"),
  handoffQrImage: document.getElementById("handoffQrImage"),
  handoffUrlInput: document.getElementById("handoffUrlInput"),
  copyHandoffUrlButton: document.getElementById("copyHandoffUrlButton"),
  openHandoffUrlButton: document.getElementById("openHandoffUrlButton"),
  commandInput: document.getElementById("commandInput"),
  sendCommandButton: document.getElementById("sendCommandButton"),
  terminalSelectableOutput: document.getElementById("terminalSelectableOutput"),
  refreshSelectableOutputButton: document.getElementById("refreshSelectableOutputButton"),
  copySelectableOutputButton: document.getElementById("copySelectableOutputButton"),
  installerQuickList: document.getElementById("installerQuickList"),
  detectedLinksList: document.getElementById("detectedLinksList"),
  detectedAuthUrlInput: document.getElementById("detectedAuthUrlInput"),
  copyDetectedAuthUrlButton: document.getElementById("copyDetectedAuthUrlButton"),
  openDetectedAuthUrlButton: document.getElementById("openDetectedAuthUrlButton"),
  useDetectedAsCallbackButton: document.getElementById("useDetectedAsCallbackButton"),
  profileCodexButton: document.getElementById("profileCodexButton"),
  profileClaudeButton: document.getElementById("profileClaudeButton"),
  profileGenericButton: document.getElementById("profileGenericButton"),
  helperStatusText: document.getElementById("helperStatusText"),
  deviceCodeInput: document.getElementById("deviceCodeInput"),
  pasteDeviceCodeButton: document.getElementById("pasteDeviceCodeButton"),
  copyDeviceCodeButton: document.getElementById("copyDeviceCodeButton"),
  sendDeviceCodeButton: document.getElementById("sendDeviceCodeButton"),
  helperReconnectButton: document.getElementById("helperReconnectButton"),
  oauthCallbackInput: document.getElementById("oauthCallbackInput"),
  relayOAuthCallbackButton: document.getElementById("relayOAuthCallbackButton"),
  clearOAuthFieldsButton: document.getElementById("clearOAuthFieldsButton"),
  filesBreadcrumbs: document.getElementById("filesBreadcrumbs"),
  filesFolderSelect: document.getElementById("filesFolderSelect"),
  openFilesFolderButton: document.getElementById("openFilesFolderButton"),
  filesStatusText: document.getElementById("filesStatusText"),
  filesList: document.getElementById("filesList"),
  refreshFilesButton: document.getElementById("refreshFilesButton"),
  downloadFolderButton: document.getElementById("downloadFolderButton"),
  uploadFileButton: document.getElementById("uploadFileButton"),
  uploadInput: document.getElementById("uploadInput"),
  createFolderButton: document.getElementById("createFolderButton"),
  passwordInput: document.getElementById("passwordInput"),
  loginButton: document.getElementById("loginButton"),
  logoutButton: document.getElementById("logoutButton"),
  authStatusText: document.getElementById("authStatusText"),
  themeSelect: document.getElementById("themeSelect"),
  fontSizeSelect: document.getElementById("fontSizeSelect"),
  hapticsToggle: document.getElementById("hapticsToggle"),
  resetPreferencesButton: document.getElementById("resetPreferencesButton")
};

const keys = {
  activeScene: "m.ui.activeScene",
  themeMode: "m.settings.themeMode",
  terminalFontSize: "m.settings.terminalFontSize",
  haptics: "m.settings.haptics",
  scrollMode: "m.terminal.scrollMode",
  lastSessionId: "m.terminal.lastSessionId"
};

const state = {
  activeScene: localStorage.getItem(keys.activeScene) || "terminal",
  themeMode: localStorage.getItem(keys.themeMode) || "auto",
  terminalFontSize: localStorage.getItem(keys.terminalFontSize) || "auto",
  haptics: localStorage.getItem(keys.haptics) === "1",
  scrollMode: localStorage.getItem(keys.scrollMode) || "terminal",
  lastSessionId: localStorage.getItem(keys.lastSessionId) || "",
  activeSessionId: null,
  sessions: [],
  currentFilesPath: ".",
  authed: false
};

const MOBILE_BUILD = "2026-02-27.01";
const MAX_DETECTED_LINKS = 12;
const quickInstallers = [
  {
    name: "Claude Code",
    description: "Anthropic Claude Code CLI",
    command: "npm install -g @anthropic-ai/claude-code"
  },
  {
    name: "Gemini CLI",
    description: "Google Gemini command line tool",
    command: "npm install -g @google/gemini-cli"
  },
  {
    name: "OpenAI Codex",
    description: "OpenAI Codex CLI",
    command: "npm install -g @openai/codex"
  },
  {
    name: "Cline",
    description: "Cline terminal helper CLI",
    command: "npm install -g cline"
  }
];

let deferredInstallPrompt = null;
let socket = null;
let terminal = null;
let fitAddon = null;
let swipeStartX = null;
let swipeStartY = null;
let selectableOutputLocked = false;
let heartbeatTimer = null;
let reconnectTimer = null;
let allowAutoReconnect = true;
let suppressNextAutoReconnect = false;
let helperProfile = "codex";
let pageTouchStartY = 0;
let sceneHistory = [];
let navInitialized = false;
let skipNextPopPush = false;
const terminalSessionBuffers = new Map();
let detectedAuthUrl = "";
const detectedLinks = new Map();

function joinRelativePath(base, name) {
  if (!base || base === ".") return name;
  return `${base.replace(/\/+$/, "")}/${name}`;
}

function normalizeFileEntries(listResponse) {
  const basePath = listResponse?.path || ".";
  const rawEntries = Array.isArray(listResponse?.entries)
    ? listResponse.entries
    : Array.isArray(listResponse?.items)
      ? listResponse.items
      : [];
  return rawEntries.map((entry) => {
    const typeRaw = entry.type || "file";
    const normalizedType = typeRaw === "dir" || typeRaw === "directory" ? "dir" : "file";
    return {
      name: entry.name,
      type: normalizedType,
      path: entry.path || joinRelativePath(basePath, entry.name),
      size: entry.size ?? 0,
      mtime: entry.mtime ?? ""
    };
  });
}

function normalizePathValue(pathValue) {
  if (!pathValue || pathValue === "./" || pathValue === ".\\") {
    return ".";
  }
  let normalized = String(pathValue).replace(/\\/g, "/");
  normalized = normalized.replace(/^\.\/+/, "");
  normalized = normalized.replace(/\/{2,}/g, "/");
  normalized = normalized.replace(/^\/+|\/+$/g, "");
  return normalized || ".";
}

function api(path, options = {}) {
  return fetch(path, {
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    },
    ...options
  }).then(async (response) => {
    let json = {};
    try {
      json = await response.json();
    } catch {
      json = {};
    }
    if (!response.ok) {
      const error = new Error(json.message || `${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }
    return json;
  });
}

function vibrate() {
  if (state.haptics && navigator.vibrate) {
    navigator.vibrate(14);
  }
}

function updateViewportVar() {
  const height = window.visualViewport?.height || window.innerHeight || 0;
  if (height > 0) {
    document.documentElement.style.setProperty("--vh", `${height * 0.01}px`);
  }
}

function resolvedTheme(mode) {
  if (mode !== "auto") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode) {
  state.themeMode = mode;
  localStorage.setItem(keys.themeMode, mode);
  document.documentElement.setAttribute("data-theme", resolvedTheme(mode));
  if (els.themeSelect) {
    els.themeSelect.value = mode;
  }
  if (terminal?.options) {
    terminal.options.theme = getTerminalTheme(resolvedTheme(mode));
  }
}

function getTerminalTheme(mode) {
  if (mode === "dark") {
    return { background: "#04070d", foreground: "#d4e2f4", cursor: "#10a37f" };
  }
  return { background: "#0b1220", foreground: "#dce8f8", cursor: "#10a37f" };
}

function getOpenSheetName() {
  if (!els.sessionsSheet.classList.contains("hidden")) return "sessions";
  if (!els.moreSheet.classList.contains("hidden")) return "more";
  if (els.keysSheet && !els.keysSheet.classList.contains("hidden")) return "keys";
  if (els.handoffSheet && !els.handoffSheet.classList.contains("hidden")) return "handoff";
  return null;
}

function pushNavState(kind, value) {
  if (!navInitialized || skipNextPopPush) {
    return;
  }
  window.history.pushState({ appNav: true, kind, value }, "", window.location.href);
}

function rememberLastSession(sessionId) {
  if (!sessionId) {
    state.lastSessionId = "";
    localStorage.removeItem(keys.lastSessionId);
    return;
  }
  state.lastSessionId = sessionId;
  localStorage.setItem(keys.lastSessionId, sessionId);
}

function pickPreferredSessionId(sessions, serverActiveSessionId) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return null;
  }
  if (state.lastSessionId && sessions.some((session) => session.id === state.lastSessionId)) {
    return state.lastSessionId;
  }
  if (serverActiveSessionId && sessions.some((session) => session.id === serverActiveSessionId)) {
    return serverActiveSessionId;
  }
  return sessions[0]?.id || null;
}

function setScene(scene, options = {}) {
  const { fromPop = false } = options;
  if (!els.scenes[scene]) scene = "terminal";
  if ((scene === "terminal" || scene === "files") && !state.authed) {
    scene = "access";
  }
  state.activeScene = scene;
  localStorage.setItem(keys.activeScene, scene);
  if (!fromPop && sceneHistory[sceneHistory.length - 1] !== scene) {
    sceneHistory.push(scene);
    pushNavState("scene", scene);
  }
  for (const [name, el] of Object.entries(els.scenes)) {
    el.classList.toggle("active", name === scene);
  }
  for (const item of els.drawerItems) {
    item.classList.toggle("active", item.dataset.scene === scene);
  }
  closeDrawer();
  if (scene === "terminal") {
    void refreshFolderPicker(els.terminalFolderSelect.value || ".");
    terminal?.focus?.();
  } else if (scene === "files") {
    void refreshFiles(state.currentFilesPath);
  }
}

function openDrawer() {
  if (!els.mobileDrawer.classList.contains("hidden")) {
    return;
  }
  els.mobileDrawer.classList.remove("hidden");
  els.drawerBackdrop.classList.remove("hidden");
  els.mobileDrawer.setAttribute("aria-hidden", "false");
  pushNavState("drawer", "open");
}

function closeDrawer() {
  els.mobileDrawer.classList.add("hidden");
  els.drawerBackdrop.classList.add("hidden");
  els.mobileDrawer.setAttribute("aria-hidden", "true");
}

function setScrollMode(mode) {
  state.scrollMode = "terminal";
  localStorage.setItem(keys.scrollMode, "terminal");
  document.body.classList.remove("m-scroll-page");
  if (els.toggleScrollModeButton) {
    els.toggleScrollModeButton.title = "View locked";
    els.toggleScrollModeButton.setAttribute("aria-label", "View locked");
  }
}

function applyFontSize(value) {
  const normalized = value || "auto";
  state.terminalFontSize = normalized;
  localStorage.setItem(keys.terminalFontSize, normalized);
  if (els.fontSizeSelect) {
    els.fontSizeSelect.value = normalized;
  }
  const size = normalized === "auto" ? (window.innerWidth <= 520 ? 11 : 13) : Number(normalized);
  if (terminal?.options && Number.isFinite(size)) {
    terminal.options.fontSize = size;
    fitAddon?.fit?.();
    sendResize();
  }
}

function setStatus(status, text) {
  els.terminalStatusBadge.textContent = status;
  els.terminalStatusBadge.className = `badge ${status}`;
  els.mConnectionLabel.textContent = `${text || status} - ${MOBILE_BUILD}`;
}

function ensureTerminal() {
  if (terminal) return;
  if (!window.Terminal || !window.FitAddon) {
    els.terminalViewport.textContent = "Terminal failed to load.";
    return;
  }
  terminal = new window.Terminal({
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: 12,
    cursorBlink: true,
    convertEol: true,
    theme: getTerminalTheme(resolvedTheme(state.themeMode))
  });
  fitAddon = new window.FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(els.terminalViewport);
  terminal.writeln("Remote Terminal Mobile ready. Tap Connect.");
  applyFontSize(state.terminalFontSize);
  fitAddon.fit();
  terminal.onData((data) => {
    sendTerminalInput(data);
  });
  window.addEventListener("resize", () => {
    fitAddon?.fit?.();
    sendResize();
  });
}

function appendSessionOutput(sessionId, data) {
  if (!sessionId || !data) {
    return;
  }
  const previous = terminalSessionBuffers.get(sessionId) || "";
  const next = `${previous}${data}`;
  const maxChars = 250000;
  const output = next.length > maxChars ? next.slice(next.length - maxChars) : next;
  terminalSessionBuffers.set(sessionId, output);
  maybeCaptureAuthLink(sessionId, data);
  if (sessionId === state.activeSessionId && !selectableOutputLocked) {
    updateSelectableOutput();
  }
}

function renderActiveSessionBuffer() {
  if (!terminal) {
    return;
  }
  const activeId = state.activeSessionId;
  terminal.reset();
  if (!activeId) {
    terminal.writeln("No active session. Tap Sessions -> New Session.");
    return;
  }
  const content = terminalSessionBuffers.get(activeId) || "";
  if (!content) {
    terminal.writeln(`[session ${activeId.slice(0, 8)} ready]`);
    updateSelectableOutput();
    return;
  }
  terminal.write(content);
  updateSelectableOutput();
}

function resetSessionBuffers() {
  terminalSessionBuffers.clear();
  updateSelectableOutput();
}

function clearSheetTransforms() {
  [els.sessionsSheet, els.moreSheet, els.handoffSheet, els.keysSheet].forEach((sheet) => {
    if (!sheet) return;
    sheet.style.transform = "";
    sheet.style.transition = "";
  });
}

function closeSheets() {
  clearSheetTransforms();
  els.sessionsSheet.classList.add("hidden");
  els.moreSheet.classList.add("hidden");
  els.keysSheet?.classList.add("hidden");
  els.handoffSheet?.classList.add("hidden");
}

function openSessionsSheet() {
  if (!els.sessionsSheet.classList.contains("hidden")) {
    return;
  }
  els.sessionsSheet.classList.remove("hidden");
  els.moreSheet.classList.add("hidden");
  els.keysSheet?.classList.add("hidden");
  els.handoffSheet?.classList.add("hidden");
  pushNavState("sheet", "sessions");
}

function openMoreSheet() {
  if (!els.moreSheet.classList.contains("hidden")) {
    return;
  }
  els.moreSheet.classList.remove("hidden");
  els.sessionsSheet.classList.add("hidden");
  els.keysSheet?.classList.add("hidden");
  els.handoffSheet?.classList.add("hidden");
  pushNavState("sheet", "more");
  if (!selectableOutputLocked) {
    updateSelectableOutput();
  }
}

function openKeysSheet() {
  if (els.keysSheet && !els.keysSheet.classList.contains("hidden")) {
    return;
  }
  els.keysSheet?.classList.remove("hidden");
  els.sessionsSheet.classList.add("hidden");
  els.moreSheet.classList.add("hidden");
  els.handoffSheet?.classList.add("hidden");
  pushNavState("sheet", "keys");
}

function openHandoffSheet() {
  if (els.handoffSheet && !els.handoffSheet.classList.contains("hidden")) {
    return;
  }
  buildHandoffPayload();
  els.handoffSheet?.classList.remove("hidden");
  els.sessionsSheet.classList.add("hidden");
  els.moreSheet.classList.add("hidden");
  els.keysSheet?.classList.add("hidden");
  pushNavState("sheet", "handoff");
}

function connectTerminal() {
  ensureTerminal();
  if (!state.authed) {
    setScene("access");
    return;
  }
  allowAutoReconnect = true;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  resetSessionBuffers();
  let initializedFromServer = false;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);
  setStatus("idle", "connecting...");
  socket.addEventListener("open", () => {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    startSocketHeartbeat();
    setStatus("running", "connected");
    socket.send(JSON.stringify({ type: "list_sessions" }));
    terminal?.focus?.();
  });
  socket.addEventListener("close", (event) => {
    stopSocketHeartbeat();
    state.activeSessionId = null;
    state.sessions = [];
    resetSessionBuffers();
    renderSessions();
    syncSessionLabel();
    setStatus("failed", "disconnected");
    socket = null;
    const replacedByAnotherClient =
      event?.code === 1012 ||
      /replaced by new client/i.test(String(event?.reason || ""));
    if (suppressNextAutoReconnect || replacedByAnotherClient) {
      suppressNextAutoReconnect = false;
      return;
    }
    scheduleAutoReconnect();
  });
  socket.addEventListener("message", (event) => {
    const payload = parseMessage(event.data);
    if (!payload) return;
    if (payload.type === "output") {
      appendSessionOutput(payload.sessionId, payload.data || "");
      if (payload.sessionId && payload.sessionId === state.activeSessionId) {
        terminal?.write(payload.data || "");
      }
      return;
    }
    if (payload.type === "session_list") {
      state.sessions = payload.sessions || [];
      state.activeSessionId = pickPreferredSessionId(state.sessions, payload.activeSessionId);
      if (!initializedFromServer) {
        initializedFromServer = true;
        if (!state.sessions.length && socket?.readyState === WebSocket.OPEN) {
          const cwd = els.terminalFolderSelect.value || ".";
          socket.send(JSON.stringify({ type: "create_session", cwd }));
        } else if (state.activeSessionId) {
          rememberLastSession(state.activeSessionId);
          renderActiveSessionBuffer();
          setStatus("running", `session ${state.activeSessionId.slice(0, 6)}`);
        }
      }
      renderSessions();
      syncSessionLabel();
      return;
    }
    if (payload.type === "status") {
      if (payload.status === "started" && payload.sessionId) {
        state.activeSessionId = payload.sessionId;
        rememberLastSession(payload.sessionId);
        if (!terminalSessionBuffers.has(payload.sessionId)) {
          terminalSessionBuffers.set(payload.sessionId, "");
        }
        renderActiveSessionBuffer();
        syncSessionLabel();
        setStatus("running", `session ${payload.sessionId.slice(0, 6)}`);
      } else if (payload.status === "switched" && payload.sessionId) {
        state.activeSessionId = payload.sessionId;
        rememberLastSession(payload.sessionId);
        renderActiveSessionBuffer();
        syncSessionLabel();
      } else if (payload.status === "error") {
        setStatus("failed", payload.message || "error");
      }
      return;
    }
    if (payload.type === "session_closed") {
      state.sessions = state.sessions.filter((s) => s.id !== payload.sessionId);
      terminalSessionBuffers.delete(payload.sessionId);
      if (state.lastSessionId === payload.sessionId) {
        rememberLastSession("");
      }
      if (state.activeSessionId === payload.sessionId) {
        state.activeSessionId = pickPreferredSessionId(state.sessions, null);
      }
      renderActiveSessionBuffer();
      renderSessions();
      syncSessionLabel();
    }
  });
}

function startSocketHeartbeat() {
  stopSocketHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    // Application-level heartbeat to keep mobile network/tunnel path warm.
    socket.send(JSON.stringify({ type: "list_sessions" }));
  }, 20_000);
}

function stopSocketHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleAutoReconnect() {
  if (!allowAutoReconnect || !state.authed) {
    return;
  }
  if (document.hidden) {
    return;
  }
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectTerminal();
  }, 1800);
}

function parseMessage(data) {
  try {
    return JSON.parse(data);
  } catch {
    // Ignore non-JSON payloads to avoid cross-session pollution.
    return null;
  }
}

function sendTerminalInput(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !state.activeSessionId) return;
  socket.send(JSON.stringify({ type: "input", sessionId: state.activeSessionId, data }));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus("running", "copied command");
  } catch {
    setStatus("failed", "copy failed");
  }
}

function setHelperStatus(text) {
  if (els.helperStatusText) {
    els.helperStatusText.textContent = text;
  }
}

function applyHelperProfile(profile) {
  helperProfile = profile;
  const syncProfileButton = (button, active) => {
    if (!button) return;
    button.classList.add("chip");
    if (active) {
      button.classList.remove("secondary");
    } else {
      button.classList.add("secondary");
    }
  };
  syncProfileButton(els.profileCodexButton, profile === "codex");
  syncProfileButton(els.profileClaudeButton, profile === "claude");
  syncProfileButton(els.profileGenericButton, profile === "generic");

  if (profile === "codex") {
    if (els.deviceCodeInput) {
      els.deviceCodeInput.placeholder = "Paste Codex device code";
    }
    if (els.oauthCallbackInput) {
      els.oauthCallbackInput.placeholder = "http://localhost:1455/auth/callback?code=...";
    }
    setHelperStatus("Profile: Codex");
    return;
  }
  if (profile === "claude") {
    if (els.deviceCodeInput) {
      els.deviceCodeInput.placeholder = "Paste Claude code/token";
    }
    if (els.oauthCallbackInput) {
      els.oauthCallbackInput.placeholder = "http://localhost:*/auth/callback?...";
    }
    setHelperStatus("Profile: Claude");
    return;
  }
  if (els.deviceCodeInput) {
    els.deviceCodeInput.placeholder = "Paste OTP/code/token";
  }
  if (els.oauthCallbackInput) {
    els.oauthCallbackInput.placeholder = "http://localhost:<port>/<path>?query";
  }
  setHelperStatus("Profile: Generic OAuth");
}

function runPreparedCommand(command) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !state.activeSessionId) {
    setStatus("failed", "connect terminal first");
    return;
  }
  sendTerminalInput(`${command}\r`);
  setStatus("running", "installer command sent");
  closeSheets();
  terminal?.focus?.();
}

function stripAnsi(text) {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .replace(/\x1B\][^\x07]*(?:\x07|\x1B\\)/g, "")
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

function getSessionBufferTail(sessionId, maxChars = 12000) {
  if (!sessionId) {
    return "";
  }
  const value = terminalSessionBuffers.get(sessionId) || "";
  if (!value) {
    return "";
  }
  return value.length > maxChars ? value.slice(value.length - maxChars) : value;
}

function getActiveSessionOutputText() {
  return stripAnsi(getSessionBufferTail(state.activeSessionId, 60000));
}

function updateSelectableOutput() {
  if (!els.terminalSelectableOutput) {
    return;
  }
  const output = getActiveSessionOutputText();
  if (detectedAuthUrl) {
    els.terminalSelectableOutput.value = `${detectedAuthUrl}\n\n${output}`;
    return;
  }
  els.terminalSelectableOutput.value = output;
}

function extractUrls(text) {
  if (!text || typeof text !== "string") {
    return [];
  }
  const allowed = /[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/;
  const starts = [];
  const startRegex = /https?:\/\//gi;
  let match;
  while ((match = startRegex.exec(text)) !== null) {
    starts.push(match.index);
  }
  const urls = [];
  for (const start of starts) {
    let i = start;
    let built = "";
    while (i < text.length) {
      const ch = text[i];
      if (ch === "\r") {
        i += 1;
        continue;
      }
      if (ch === "\n") {
        const next = text[i + 1];
        if (next === "\n" || next === "\r") {
          break;
        }
        i += 1;
        continue;
      }
      if (ch === " " || ch === "\t") {
        break;
      }
      if (!allowed.test(ch)) {
        break;
      }
      built += ch;
      i += 1;
    }
    const cleaned = built.replace(/[),.;]+$/g, "");
    if (cleaned.length >= "https://x.y".length) {
      urls.push(cleaned);
    }
  }
  return Array.from(new Set(urls));
}

function maybeCaptureAuthLink(sessionId, latestChunk = "") {
  const text = stripAnsi(`${getSessionBufferTail(sessionId, 12000)}\n${latestChunk || ""}`);
  const urls = extractUrls(text);
  for (const url of urls) {
    if (!detectedLinks.has(url)) {
      detectedLinks.set(url, { value: url, type: "url" });
      while (detectedLinks.size > MAX_DETECTED_LINKS) {
        const oldest = detectedLinks.keys().next().value;
        if (!oldest) break;
        detectedLinks.delete(oldest);
      }
    }
  }
  const portMatches = text && typeof text === "string" ? text.match(/\b(?:localhost|127\.0\.0\.1):(\d{2,5})\b/gi) || [] : [];
  for (const portText of portMatches) {
    const normalized = portText.toLowerCase();
    if (!detectedLinks.has(normalized)) {
      detectedLinks.set(normalized, { value: normalized, type: "port" });
      while (detectedLinks.size > MAX_DETECTED_LINKS) {
        const oldest = detectedLinks.keys().next().value;
        if (!oldest) break;
        detectedLinks.delete(oldest);
      }
    }
  }
  renderDetectedLinks();

  if (!urls.length) {
    return;
  }
  const preferredCandidates = urls
    .filter((url) => /auth\.openai\.com|console\.anthropic\.com|accounts\.google\.com|oauth|login|device/i.test(url))
    .sort((a, b) => b.length - a.length);
  const preferred = preferredCandidates[0];
  const selected = preferred || [...urls].sort((a, b) => b.length - a.length)[0];
  if (!selected) {
    return;
  }
  detectedAuthUrl = selected;
  if (els.detectedAuthUrlInput) {
    els.detectedAuthUrlInput.value = selected;
  }
  if (!selectableOutputLocked) {
    updateSelectableOutput();
  }
}

function renderDetectedLinks() {
  if (!els.detectedLinksList) {
    return;
  }
  els.detectedLinksList.innerHTML = "";
  if (!detectedLinks.size) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No links detected yet.";
    els.detectedLinksList.appendChild(empty);
    return;
  }
  const items = Array.from(detectedLinks.values()).reverse();
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "installer-row";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.type === "port" ? "Detected Port" : "Detected Link";
    const value = document.createElement("p");
    value.className = "muted";
    value.textContent = item.value;
    const actions = document.createElement("div");
    actions.className = "inline-actions";
    const copyBtn = document.createElement("button");
    copyBtn.className = "chip secondary";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => copyText(item.value));
    actions.appendChild(copyBtn);
    if (item.type === "url") {
      const openBtn = document.createElement("button");
      openBtn.className = "chip secondary";
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => window.open(item.value, "_blank", "noopener"));
      const useBtn = document.createElement("button");
      useBtn.className = "chip";
      useBtn.textContent = "Use Callback";
      useBtn.addEventListener("click", () => {
        if (els.oauthCallbackInput) {
          els.oauthCallbackInput.value = item.value;
        }
        setHelperStatus("Callback URL selected from detected links.");
      });
      actions.append(openBtn, useBtn);
    }
    row.append(title, value, actions);
    els.detectedLinksList.appendChild(row);
  }
}

function getActiveSessionCwd() {
  const active = state.sessions.find((s) => s.id === state.activeSessionId);
  return active?.cwd || els.terminalFolderSelect?.value || ".";
}

function buildHandoffPayload() {
  const cwd = encodeURIComponent(getActiveSessionCwd());
  const url = `${window.location.origin}/?handoff=1&cwd=${cwd}`;
  if (els.handoffUrlInput) {
    els.handoffUrlInput.value = url;
  }
  if (els.handoffQrImage) {
    els.handoffQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      url
    )}`;
  }
}

async function relayOAuthCallback() {
  if (!state.authed) {
    setScene("access");
    return;
  }
  const callbackUrl = (els.oauthCallbackInput?.value || "").trim();
  if (!callbackUrl) {
    setStatus("failed", "paste callback URL first");
    setHelperStatus("Paste a localhost callback URL first.");
    return;
  }
  try {
    const result = await api("/api/oauth/relay-callback", {
      method: "POST",
      body: JSON.stringify({ callbackUrl })
    });
    if (result.ok) {
      setStatus("running", "oauth callback relayed");
      setHelperStatus(`Callback relayed (HTTP ${result.status}).`);
    } else {
      setStatus("failed", `relay status ${result.status}`);
      setHelperStatus(`Relay returned HTTP ${result.status}.`);
    }
  } catch (error) {
    setStatus("failed", `relay error: ${error.message}`);
    setHelperStatus(`Relay failed: ${error.message}`);
  }
}

async function pasteDeviceCodeFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      setHelperStatus("Clipboard is empty.");
      return;
    }
    if (els.deviceCodeInput) {
      els.deviceCodeInput.value = text.trim();
    }
    setHelperStatus("Code pasted from clipboard.");
  } catch {
    setHelperStatus("Clipboard read blocked by browser.");
  }
}

async function copyDeviceCode() {
  const value = (els.deviceCodeInput?.value || "").trim();
  if (!value) {
    setHelperStatus("No device code to copy.");
    return;
  }
  await copyText(value);
  setHelperStatus("Code copied.");
}

function sendDeviceCodeToTerminal() {
  const code = (els.deviceCodeInput?.value || "").trim();
  if (!code) {
    setHelperStatus("Paste a device code first.");
    return;
  }
  if (!state.activeSessionId) {
    setHelperStatus("No active terminal session. Connect and create/open a session first.");
    return;
  }
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setHelperStatus("Terminal disconnected. Tap Reconnect, then send code.");
    return;
  }
  sendTerminalInput(`${code}\r`);
  setHelperStatus("Code sent to active terminal.");
  setStatus("running", "device code sent");
}

function renderQuickInstallers() {
  if (!els.installerQuickList) {
    return;
  }
  els.installerQuickList.innerHTML = "";
  for (const tool of quickInstallers) {
    const row = document.createElement("div");
    row.className = "installer-row";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = tool.name;

    const desc = document.createElement("p");
    desc.className = "muted";
    desc.textContent = tool.description;

    const actions = document.createElement("div");
    actions.className = "inline-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "chip secondary";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => copyText(tool.command));

    const runBtn = document.createElement("button");
    runBtn.className = "chip";
    runBtn.textContent = "Install";
    runBtn.addEventListener("click", () => runPreparedCommand(tool.command));

    actions.append(copyBtn, runBtn);
    row.append(title, desc, actions);
    els.installerQuickList.appendChild(row);
  }
}

function sendResize() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !state.activeSessionId || !terminal) return;
  socket.send(
    JSON.stringify({
      type: "resize",
      sessionId: state.activeSessionId,
      cols: Number(terminal.cols || 120),
      rows: Number(terminal.rows || 30)
    })
  );
}

function switchSession(sessionId) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  state.activeSessionId = sessionId;
  rememberLastSession(sessionId);
  renderActiveSessionBuffer();
  socket.send(JSON.stringify({ type: "switch_session", sessionId }));
  syncSessionLabel();
  renderSessions();
  terminal?.focus?.();
}

function renderSessions() {
  els.sessionsList.innerHTML = "";
  if (!state.sessions.length) {
    const li = document.createElement("li");
    li.className = "item";
    li.textContent = "No sessions yet.";
    els.sessionsList.appendChild(li);
    return;
  }
  for (const session of state.sessions) {
    const li = document.createElement("li");
    li.className = "item";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${session.id.slice(0, 8)}  ${session.cwd || "."}`;
    const row = document.createElement("div");
    row.className = "inline-actions";
    const openBtn = document.createElement("button");
    openBtn.className = "chip secondary";
    openBtn.textContent = session.id === state.activeSessionId ? "Active" : "Open";
    openBtn.addEventListener("click", () => switchSession(session.id));
    row.appendChild(openBtn);
    li.append(title, row);
    els.sessionsList.appendChild(li);
  }
}

function syncSessionLabel() {
  if (!state.activeSessionId) {
    els.terminalSessionLabel.textContent = "no session";
    return;
  }
  const active = state.sessions.find((s) => s.id === state.activeSessionId);
  els.terminalSessionLabel.textContent = active
    ? `${active.id.slice(0, 8)}  ${active.cwd || "."}`
    : state.activeSessionId.slice(0, 8);
}

function sendSpecialKey(name) {
  const map = {
    up: "\u001b[A",
    down: "\u001b[B",
    right: "\u001b[C",
    left: "\u001b[D",
    enter: "\r",
    tab: "\t",
    shiftTab: "\u001b[Z",
    esc: "\u001b",
    backspace: "\u007f",
    ctrlc: "\u0003"
  };
  const value = map[name];
  if (value) sendTerminalInput(value);
}

function resumeLastSession() {
  if (!state.lastSessionId) {
    setStatus("idle", "no last session saved");
    return;
  }
  const existing = state.sessions.find((session) => session.id === state.lastSessionId);
  if (!existing) {
    setStatus("failed", "last session unavailable");
    return;
  }
  switchSession(existing.id);
  setStatus("running", `resumed ${existing.id.slice(0, 6)}`);
}

function bindSwipeSessions() {
  els.terminalViewport.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      swipeStartX = touch.clientX;
      swipeStartY = touch.clientY;
    },
    { passive: true }
  );
  els.terminalViewport.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch || swipeStartX === null || swipeStartY === null || state.sessions.length < 2) {
        swipeStartX = null;
        swipeStartY = null;
        return;
      }
      const dx = touch.clientX - swipeStartX;
      const dy = touch.clientY - swipeStartY;
      swipeStartX = null;
      swipeStartY = null;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      const index = state.sessions.findIndex((s) => s.id === state.activeSessionId);
      if (index < 0) return;
      const next = dx < 0 ? index + 1 : index - 1;
      if (next >= 0 && next < state.sessions.length) {
        switchSession(state.sessions[next].id);
      }
    },
    { passive: true }
  );
}

function bindSwipeCloseForSheet(sheet) {
  if (!sheet) {
    return;
  }
  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let lastTs = 0;
  let dy = 0;
  let velocity = 0;
  let tracking = false;
  let dragging = false;
  let startInSafeZone = false;
  let startInInteractive = false;

  sheet.addEventListener(
    "touchstart",
    (event) => {
      if (sheet.classList.contains("hidden")) {
        return;
      }
      const touch = event.touches?.[0];
      if (!touch) {
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      startInSafeZone = Boolean(target?.closest(".sheet-handle, .sheet-head"));
      startInInteractive = Boolean(target?.closest("textarea, input, select, button, a, .list, [contenteditable='true']"));
      tracking = true;
      dragging = false;
      dy = 0;
      velocity = 0;
      startX = touch.clientX;
      startY = touch.clientY;
      lastY = touch.clientY;
      lastTs = performance.now();
      sheet.style.transition = "";
      sheet.style.transform = "";
    },
    { passive: true }
  );

  sheet.addEventListener(
    "touchmove",
    (event) => {
      if (!tracking || sheet.classList.contains("hidden")) {
        return;
      }
      const touch = event.touches?.[0];
      if (!touch) {
        return;
      }
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (!dragging) {
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          tracking = false;
          return;
        }
        const startThreshold = startInSafeZone ? 8 : 16;
        if (deltaY < startThreshold) {
          return;
        }
        if (!startInSafeZone && startInInteractive) {
          tracking = false;
          return;
        }
        if (sheet.scrollTop > 0) {
          tracking = false;
          return;
        }
        dragging = true;
        sheet.style.transition = "none";
      }

      if (!dragging) {
        return;
      }
      dy = Math.max(0, deltaY);
      const now = performance.now();
      const dt = Math.max(1, now - lastTs);
      velocity = (touch.clientY - lastY) / dt;
      lastY = touch.clientY;
      lastTs = now;
      sheet.style.transform = `translateY(${Math.min(dy, 260)}px)`;
      event.preventDefault();
    },
    { passive: false }
  );

  sheet.addEventListener(
    "touchend",
    () => {
      if (!tracking) {
        return;
      }
      tracking = false;
      if (!dragging) {
        clearSheetTransforms();
        return;
      }
      const shouldClose = dy > 88 || velocity > 0.75;
      if (shouldClose) {
        closeSheets();
        return;
      }
      sheet.style.transition = "transform 160ms ease";
      sheet.style.transform = "translateY(0)";
      window.setTimeout(() => {
        if (!sheet.classList.contains("hidden")) {
          sheet.style.transition = "";
          sheet.style.transform = "";
        }
      }, 180);
    },
    { passive: true }
  );
}

function bindSheetSwipeClose() {
  bindSwipeCloseForSheet(els.sessionsSheet);
  bindSwipeCloseForSheet(els.moreSheet);
  bindSwipeCloseForSheet(els.keysSheet);
  bindSwipeCloseForSheet(els.handoffSheet);
}

function bindPullToRefreshGuard() {
  document.addEventListener(
    "touchstart",
    (event) => {
      pageTouchStartY = event.touches?.[0]?.clientY ?? 0;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      if (state.activeScene !== "terminal") {
        return;
      }

      const activeSheetOpen =
        !els.moreSheet.classList.contains("hidden") ||
        !els.sessionsSheet.classList.contains("hidden") ||
        !els.keysSheet?.classList.contains("hidden") ||
        !els.handoffSheet.classList.contains("hidden");
      if (activeSheetOpen) {
        return;
      }

      const atTop = (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
      const pullingDown = touch.clientY - pageTouchStartY > 8;
      if (atTop && pullingDown) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}

async function refreshFolderPicker(selected = null) {
  try {
    const data = await api("/api/files?path=.");
    const entries = normalizeFileEntries(data);
    const dirs = entries.filter((item) => item.type === "dir").map((item) => item.path);
    els.terminalFolderSelect.innerHTML = "";
    const rootOpt = document.createElement("option");
    rootOpt.value = ".";
    rootOpt.textContent = "workspace (.)";
    els.terminalFolderSelect.appendChild(rootOpt);
    for (const dir of dirs) {
      const option = document.createElement("option");
      option.value = dir;
      option.textContent = dir;
      els.terminalFolderSelect.appendChild(option);
    }
    const selectedNormalized = normalizePathValue(selected);
    els.terminalFolderSelect.value = selectedNormalized && dirs.includes(selectedNormalized) ? selectedNormalized : ".";
  } catch {
    els.terminalFolderSelect.innerHTML = `<option value=".">workspace (.)</option>`;
    const failedOpt = document.createElement("option");
    failedOpt.value = ".";
    failedOpt.textContent = "unable to load folders";
    els.terminalFolderSelect.appendChild(failedOpt);
  }
}

async function refreshFilesFolderSelect(selected = null) {
  try {
    const data = await api("/api/files?path=.");
    const entries = normalizeFileEntries(data);
    const dirs = entries.filter((item) => item.type === "dir").map((item) => item.path);
    els.filesFolderSelect.innerHTML = "";
    const rootOpt = document.createElement("option");
    rootOpt.value = ".";
    rootOpt.textContent = "workspace (.)";
    els.filesFolderSelect.appendChild(rootOpt);
    for (const dir of dirs) {
      const option = document.createElement("option");
      option.value = dir;
      option.textContent = dir;
      els.filesFolderSelect.appendChild(option);
    }
    const selectedNormalized = normalizePathValue(selected || state.currentFilesPath);
    els.filesFolderSelect.value = selectedNormalized && dirs.includes(selectedNormalized) ? selectedNormalized : ".";
  } catch {
    els.filesFolderSelect.innerHTML = `<option value=".">workspace (.)</option>`;
    const failedOpt = document.createElement("option");
    failedOpt.value = ".";
    failedOpt.textContent = "unable to load folders";
    els.filesFolderSelect.appendChild(failedOpt);
  }
}

async function createFolderFromTerminal() {
  const name = window.prompt("New folder name");
  if (!name) return;
  try {
    await api("/api/files/mkdir", {
      method: "POST",
      body: JSON.stringify({ path: name })
    });
    await refreshFolderPicker(`./${name}`);
    vibrate();
  } catch (error) {
    window.alert(error.message);
  }
}

function renderBreadcrumbs(pathValue) {
  els.filesBreadcrumbs.innerHTML = "";
  const root = document.createElement("button");
  root.textContent = ".";
  root.addEventListener("click", () => refreshFiles("."));
  els.filesBreadcrumbs.appendChild(root);
  const cleanPath = normalizePathValue(pathValue);
  if (cleanPath === ".") {
    return;
  }
  const chunks = cleanPath.split("/").filter(Boolean);
  let current = "";
  for (const chunk of chunks) {
    current = current ? `${current}/${chunk}` : chunk;
    const btn = document.createElement("button");
    btn.textContent = chunk;
    const target = current;
    btn.addEventListener("click", () => refreshFiles(target));
    els.filesBreadcrumbs.appendChild(btn);
  }
}

async function refreshFiles(pathValue = state.currentFilesPath) {
  state.currentFilesPath = normalizePathValue(pathValue || ".");
  els.filesStatusText.textContent = `path: ${state.currentFilesPath}`;
  renderBreadcrumbs(state.currentFilesPath);
  try {
    const data = await api(`/api/files?path=${encodeURIComponent(state.currentFilesPath)}`);
    const items = normalizeFileEntries(data);
    await refreshFilesFolderSelect(state.currentFilesPath);
    els.filesList.innerHTML = "";
    if (!items.length) {
      els.filesList.innerHTML = `<li class="item">This folder is empty.</li>`;
      return;
    }
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "item";
      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = `${item.type === "dir" ? "[DIR]" : "[FILE]"} ${item.name}`;
      const row = document.createElement("div");
      row.className = "inline-actions";
      if (item.type === "dir") {
        const open = document.createElement("button");
        open.className = "chip secondary icon-chip";
        open.title = "Open folder";
        open.setAttribute("aria-label", "Open folder");
        open.innerHTML = '<svg class="icon"><use href="#i-open"></use></svg>';
        open.addEventListener("click", () => refreshFiles(item.path));
        row.appendChild(open);
        const zip = document.createElement("button");
        zip.className = "chip secondary icon-chip";
        zip.title = "Download folder zip";
        zip.setAttribute("aria-label", "Download folder zip");
        zip.innerHTML = '<svg class="icon"><use href="#i-folder-download"></use></svg>';
        zip.addEventListener("click", () => downloadFolderZip(item.path));
        row.appendChild(zip);
      } else {
        const download = document.createElement("button");
        download.className = "chip secondary icon-chip";
        download.title = "Download file";
        download.setAttribute("aria-label", "Download file");
        download.innerHTML = '<svg class="icon"><use href="#i-install"></use></svg>';
        download.addEventListener("click", () => {
          window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, "_blank", "noopener");
        });
        row.appendChild(download);
      }
      const del = document.createElement("button");
      del.className = "chip secondary icon-chip";
      del.title = "Delete";
      del.setAttribute("aria-label", "Delete");
      del.innerHTML = '<svg class="icon"><use href="#i-close"></use></svg>';
      del.addEventListener("click", async () => {
        const ok = window.confirm(`Delete ${item.name}?`);
        if (!ok) return;
        try {
          await api("/api/files/delete", {
            method: "POST",
            body: JSON.stringify({ path: item.path, recursive: item.type === "dir" })
          });
          await refreshFiles(state.currentFilesPath);
        } catch (error) {
          window.alert(error.message);
        }
      });
      row.appendChild(del);
      li.append(title, row);
      els.filesList.appendChild(li);
    }
  } catch (error) {
    els.filesStatusText.textContent = `path: ${state.currentFilesPath} (error)`;
    els.filesList.innerHTML = `<li class="item">Failed to load files: ${error.message}</li>`;
  }
}

async function uploadFiles() {
  const files = Array.from(els.uploadInput.files || []);
  if (!files.length) return;
  const form = new FormData();
  for (const file of files) form.append("files", file);
  try {
    await api(`/api/files/upload?path=${encodeURIComponent(state.currentFilesPath)}`, {
      method: "POST",
      body: form
    });
    els.uploadInput.value = "";
    await refreshFiles(state.currentFilesPath);
  } catch (error) {
    window.alert(error.message);
  }
}

async function createFolderFromFiles() {
  const name = window.prompt("Folder name");
  if (!name) return;
  const pathValue = state.currentFilesPath === "." ? name : `${state.currentFilesPath}/${name}`;
  try {
    await api("/api/files/mkdir", {
      method: "POST",
      body: JSON.stringify({ path: pathValue })
    });
    await refreshFiles(state.currentFilesPath);
  } catch (error) {
    window.alert(error.message);
  }
}

function downloadFolderZip(pathValue = state.currentFilesPath) {
  const normalized = normalizePathValue(pathValue || ".");
  window.open(`/api/files/download-folder?path=${encodeURIComponent(normalized)}`, "_blank", "noopener");
}

function setAuthState(authed, label) {
  state.authed = authed;
  els.authStatusText.textContent = label;
}

async function fetchSession() {
  try {
    const data = await api("/api/auth/session");
    const authed = Boolean(data.authenticated);
    setAuthState(authed, authed ? `authenticated (${data.actorId || "admin"})` : "not authenticated");
    return authed;
  } catch {
    setAuthState(false, "not authenticated");
    return false;
  }
}

async function login() {
  const password = els.passwordInput.value;
  if (!password) return;
  try {
    await api("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) });
    els.passwordInput.value = "";
    setAuthState(true, "authenticated");
    await refreshFolderPicker();
    await refreshFiles(".");
    setScene("terminal");
    vibrate();
  } catch (error) {
    setAuthState(false, `login failed: ${error.message}`);
  }
}

async function logout() {
  allowAutoReconnect = false;
  suppressNextAutoReconnect = true;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  stopSocketHeartbeat();
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  setAuthState(false, "not authenticated");
  setStatus("idle", "not connected");
  setScene("access");
}

function bindInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installAppButton.classList.remove("hidden");
  });
  els.installAppButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installAppButton.classList.add("hidden");
  });
}

async function forceRefreshMobileCachesIfNeeded() {
  const versionKey = "m.ui.build";
  const previous = localStorage.getItem(versionKey);
  if (previous === MOBILE_BUILD) {
    return;
  }

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const scriptUrl = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
        if (scriptUrl.includes("/m-sw.js")) {
          await reg.unregister();
        }
      }
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.startsWith("remote-terminal-mobile-")) {
          await caches.delete(key);
        }
      }
    }
  } catch {
    // ignore and continue
  }

  localStorage.setItem(versionKey, MOBILE_BUILD);
}

function bindEvents() {
  els.drawerToggleButton.addEventListener("click", openDrawer);
  els.closeDrawerButton.addEventListener("click", closeDrawer);
  els.drawerBackdrop.addEventListener("click", closeDrawer);
  for (const item of els.drawerItems) {
    item.addEventListener("click", () => setScene(item.dataset.scene));
  }

  els.connectTerminalButton.addEventListener("click", connectTerminal);
  els.resumeSessionButton?.addEventListener("click", resumeLastSession);
  els.reconnectTerminalButton.addEventListener("click", () => {
    allowAutoReconnect = true;
    suppressNextAutoReconnect = true;
    stopSocketHeartbeat();
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    socket?.close();
    socket = null;
    connectTerminal();
  });
  els.toggleScrollModeButton.addEventListener("click", () => setScrollMode("terminal"));
  els.openSessionsButton.addEventListener("click", openSessionsSheet);
  els.openHandoffButton?.addEventListener("click", openHandoffSheet);
  els.closeSessionsButton.addEventListener("click", closeSheets);
  els.openMoreButton.addEventListener("click", openMoreSheet);
  els.closeMoreButton.addEventListener("click", closeSheets);
  els.closeKeysButton?.addEventListener("click", closeSheets);
  els.closeHandoffButton?.addEventListener("click", closeSheets);
  els.toggleKeysButton.addEventListener("click", () => {
    const isOpen = !els.keysSheet?.classList.contains("hidden");
    if (isOpen) {
      closeSheets();
      return;
    }
    openKeysSheet();
  });
  els.newSessionButton.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("new_session", "1");
    window.open(url.toString(), "_blank", "noopener");
  });
  els.newSessionHereButton?.addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "create_session", cwd: els.terminalFolderSelect.value || "." }));
  });
  els.closeActiveSessionButton.addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !state.activeSessionId) return;
    socket.send(JSON.stringify({ type: "close_session", sessionId: state.activeSessionId }));
  });
  els.sendCommandButton.addEventListener("click", () => {
    const cmd = els.commandInput.value.trim();
    if (!cmd) return;
    sendTerminalInput(`${cmd}\r`);
    els.commandInput.value = "";
    closeSheets();
    terminal?.focus?.();
  });
  els.commandInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      els.sendCommandButton.click();
    }
  });
  els.refreshSelectableOutputButton?.addEventListener("click", updateSelectableOutput);
  els.terminalSelectableOutput?.addEventListener("focus", () => {
    selectableOutputLocked = true;
  });
  els.terminalSelectableOutput?.addEventListener("blur", () => {
    selectableOutputLocked = false;
    updateSelectableOutput();
  });
  els.copySelectableOutputButton?.addEventListener("click", async () => {
    const text = (els.terminalSelectableOutput?.value || "").trim();
    if (!text) {
      setStatus("failed", "no terminal output yet");
      return;
    }
    await copyText(text);
  });
  els.createTerminalFolderButton.addEventListener("click", createFolderFromTerminal);
  els.terminalKeys.querySelectorAll("button[data-key]").forEach((button) => {
    const key = button.dataset.key;
    button.addEventListener("click", () => sendSpecialKey(key));
  });

  els.refreshFilesButton.addEventListener("click", () => refreshFiles(state.currentFilesPath));
  els.downloadFolderButton?.addEventListener("click", () => downloadFolderZip(state.currentFilesPath));
  els.openFilesFolderButton.addEventListener("click", () => {
    refreshFiles(els.filesFolderSelect.value || ".");
  });
  els.uploadFileButton.addEventListener("click", () => els.uploadInput.click());
  els.uploadInput.addEventListener("change", uploadFiles);
  els.createFolderButton.addEventListener("click", createFolderFromFiles);

  els.loginButton.addEventListener("click", login);
  els.logoutButton.addEventListener("click", logout);
  els.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });

  els.themeSelect.addEventListener("change", () => applyTheme(els.themeSelect.value));
  els.fontSizeSelect.addEventListener("change", () => applyFontSize(els.fontSizeSelect.value));
  els.hapticsToggle.addEventListener("change", () => {
    state.haptics = els.hapticsToggle.checked;
    localStorage.setItem(keys.haptics, state.haptics ? "1" : "0");
  });
  els.resetPreferencesButton.addEventListener("click", () => {
    localStorage.removeItem(keys.themeMode);
    localStorage.removeItem(keys.terminalFontSize);
    localStorage.removeItem(keys.haptics);
    localStorage.removeItem(keys.scrollMode);
    localStorage.removeItem(keys.activeScene);
    localStorage.removeItem(keys.lastSessionId);
    window.location.reload();
  });

  els.copyDetectedAuthUrlButton?.addEventListener("click", async () => {
    const value = (els.detectedAuthUrlInput?.value || detectedAuthUrl || "").trim();
    if (!value) {
      setStatus("failed", "no auth link yet");
      setHelperStatus("No auth link detected yet.");
      return;
    }
    await copyText(value);
    setHelperStatus("Auth link copied.");
  });
  els.openDetectedAuthUrlButton?.addEventListener("click", () => {
    const value = (els.detectedAuthUrlInput?.value || detectedAuthUrl || "").trim();
    if (!value) {
      setStatus("failed", "no auth link yet");
      setHelperStatus("No auth link available to open.");
      return;
    }
    window.open(value, "_blank", "noopener");
    setHelperStatus("Opened auth link in browser.");
  });
  els.useDetectedAsCallbackButton?.addEventListener("click", () => {
    const value = (els.detectedAuthUrlInput?.value || detectedAuthUrl || "").trim();
    if (!value) {
      setHelperStatus("No detected link to use as callback.");
      return;
    }
    if (els.oauthCallbackInput) {
      els.oauthCallbackInput.value = value;
    }
    setHelperStatus("Copied detected link to callback field.");
  });
  els.profileCodexButton?.addEventListener("click", () => applyHelperProfile("codex"));
  els.profileClaudeButton?.addEventListener("click", () => applyHelperProfile("claude"));
  els.profileGenericButton?.addEventListener("click", () => applyHelperProfile("generic"));
  els.pasteDeviceCodeButton?.addEventListener("click", pasteDeviceCodeFromClipboard);
  els.copyDeviceCodeButton?.addEventListener("click", copyDeviceCode);
  els.sendDeviceCodeButton?.addEventListener("click", sendDeviceCodeToTerminal);
  els.helperReconnectButton?.addEventListener("click", () => {
    setHelperStatus("Reconnecting terminal...");
    allowAutoReconnect = true;
    suppressNextAutoReconnect = true;
    stopSocketHeartbeat();
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    socket?.close();
    socket = null;
    connectTerminal();
  });
  els.relayOAuthCallbackButton?.addEventListener("click", relayOAuthCallback);
  els.clearOAuthFieldsButton?.addEventListener("click", () => {
    detectedAuthUrl = "";
    detectedLinks.clear();
    renderDetectedLinks();
    if (els.detectedAuthUrlInput) {
      els.detectedAuthUrlInput.value = "";
    }
    if (els.oauthCallbackInput) {
      els.oauthCallbackInput.value = "";
    }
    if (els.deviceCodeInput) {
      els.deviceCodeInput.value = "";
    }
    setHelperStatus("Helper fields cleared.");
  });
  els.copyHandoffUrlButton?.addEventListener("click", async () => {
    const url = (els.handoffUrlInput?.value || "").trim();
    if (!url) {
      return;
    }
    await copyText(url);
  });
  els.openHandoffUrlButton?.addEventListener("click", () => {
    const url = (els.handoffUrlInput?.value || "").trim();
    if (!url) {
      return;
    }
    window.open(url, "_blank", "noopener");
  });

  bindSwipeSessions();
  bindSheetSwipeClose();
  bindPullToRefreshGuard();

  window.addEventListener("popstate", () => {
    const openSheet = getOpenSheetName();
    if (openSheet) {
      closeSheets();
      return;
    }
    if (!els.mobileDrawer.classList.contains("hidden")) {
      closeDrawer();
      return;
    }
    if (sceneHistory.length > 1) {
      sceneHistory.pop();
      const previous = sceneHistory[sceneHistory.length - 1] || "terminal";
      skipNextPopPush = true;
      setScene(previous, { fromPop: true });
      skipNextPopPush = false;
      return;
    }
    window.history.pushState({ appNav: true, kind: "root", value: state.activeScene }, "", window.location.href);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSheets();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      return;
    }
    if (state.authed && state.activeScene === "terminal" && (!socket || socket.readyState !== WebSocket.OPEN)) {
      connectTerminal();
    }
  });
}

async function ensureAuthenticatedDataLoaded() {
  const authed = await fetchSession();
  if (!authed) {
    setScene("access");
    return false;
  }
  await refreshFolderPicker(els.terminalFolderSelect?.value || ".");
  await refreshFilesFolderSelect(state.currentFilesPath || ".");
  await refreshFiles(state.currentFilesPath || ".");
  return true;
}

async function bootstrap() {
  await forceRefreshMobileCachesIfNeeded();
  updateViewportVar();
  window.addEventListener("resize", updateViewportVar);
  window.visualViewport?.addEventListener("resize", updateViewportVar);
  window.visualViewport?.addEventListener("scroll", updateViewportVar);

  bindInstallPrompt();
  bindEvents();
  renderQuickInstallers();
  renderDetectedLinks();
  applyHelperProfile("codex");
  applyTheme(state.themeMode);
  applyFontSize(state.terminalFontSize);
  els.hapticsToggle.checked = state.haptics;
  setScrollMode(state.scrollMode);
  sceneHistory = [state.activeScene];
  window.history.replaceState({ appNav: true, kind: "root", value: state.activeScene }, "", window.location.href);
  window.history.pushState({ appNav: true, kind: "root-guard", value: state.activeScene }, "", window.location.href);
  navInitialized = true;
  setScene(state.activeScene);
  ensureTerminal();

  const authed = await ensureAuthenticatedDataLoaded();
  if (!authed) {
    return;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("handoff") === "1") {
    const handoffCwd = normalizePathValue(url.searchParams.get("cwd") || ".");
    if (els.terminalFolderSelect) {
      els.terminalFolderSelect.value = handoffCwd;
    }
    setScene("terminal");
    connectTerminal();
    url.searchParams.delete("handoff");
    url.searchParams.delete("cwd");
    window.history.replaceState({}, "", url.toString());
    return;
  }

  if (url.searchParams.get("new_session") === "1") {
    connectTerminal();
    url.searchParams.delete("new_session");
    window.history.replaceState({}, "", url.toString());
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/m-sw.js", { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => {});
  });
}

window.addEventListener("error", (event) => {
  if (els?.mConnectionLabel) {
    els.mConnectionLabel.textContent = `load error: ${event.message || "script failed"}`;
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason?.message || event?.reason || "startup failed";
  if (els?.mConnectionLabel) {
    els.mConnectionLabel.textContent = `startup error: ${String(reason)}`;
  }
});

bootstrap().catch((error) => {
  if (els?.mConnectionLabel) {
    els.mConnectionLabel.textContent = `bootstrap failed: ${error?.message || error}`;
  }
});

