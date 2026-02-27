
const els = {
  // App shell
  tabBar: document.getElementById("tabBar"),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]")),
  themeModeSelect: document.getElementById("themeModeSelect"),
  terminalPanel: document.getElementById("terminalPanel"),
  filesPanel: document.getElementById("filesPanel"),
  projectsPanel: document.getElementById("projectsPanel"),
  accessPanel: document.getElementById("accessPanel"),
  morePanel: document.getElementById("morePanel"),

  // Module visibility toggles
  toggleToolInstaller: document.getElementById("toggleToolInstaller"),
  toggleNetworkAccess: document.getElementById("toggleNetworkAccess"),
  toggleOAuthHelper: document.getElementById("toggleOAuthHelper"),
  toolInstallerModule: document.getElementById("toolInstallerModule"),
  networkModule: document.getElementById("networkModule"),
  oauthModule: document.getElementById("oauthModule"),

  // Access
  loginPasswordInput: document.getElementById("loginPasswordInput"),
  loginButton: document.getElementById("loginButton"),
  logoutButton: document.getElementById("logoutButton"),
  authStatusLabel: document.getElementById("authStatusLabel"),

  // Projects
  projectRepoUrlInput: document.getElementById("projectRepoUrlInput"),
  projectBranchInput: document.getElementById("projectBranchInput"),
  projectFolderInput: document.getElementById("projectFolderInput"),
  cloneProjectButton: document.getElementById("cloneProjectButton"),
  projectList: document.getElementById("projectList"),

  // Terminal
  enterTerminalFocusModeButton: document.getElementById("enterTerminalFocusModeButton"),
  exitTerminalFocusModeButton: document.getElementById("exitTerminalFocusModeButton"),
  cwdFolderSelect: document.getElementById("cwdFolderSelect"),
  createCwdFolderButton: document.getElementById("createCwdFolderButton"),
  cwdInput: document.getElementById("cwdInput"),
  connectTerminalButton: document.getElementById("connectTerminalButton"),
  restartTerminalButton: document.getElementById("restartTerminalButton"),
  focusTerminalButton: document.getElementById("focusTerminalButton"),
  statusBadge: document.getElementById("statusBadge"),
  focusStatusBadge: document.getElementById("focusStatusBadge"),
  terminalCwdLabel: document.getElementById("terminalCwdLabel"),
  focusCwdLabel: document.getElementById("focusCwdLabel"),
  focusSwipeHint: document.getElementById("focusSwipeHint"),
  dismissFocusSwipeHintButton: document.getElementById("dismissFocusSwipeHintButton"),
  terminalView: document.getElementById("terminalView"),
  terminalTextMirror: document.getElementById("terminalTextMirror"),
  terminalMirrorDetails: document.getElementById("terminalMirrorDetails"),
  mobileKeysDetails: document.getElementById("mobileKeysDetails"),
  focusPasteButton: document.getElementById("focusPasteButton"),
  focusCtrlCButton: document.getElementById("focusCtrlCButton"),
  focusClearButton: document.getElementById("focusClearButton"),
  focusReconnectButton: document.getElementById("focusReconnectButton"),
  newSessionButton: document.getElementById("newSessionButton"),
  closeSessionButton: document.getElementById("closeSessionButton"),
  sessionTabs: document.getElementById("sessionTabs"),
  focusSessionTabs: document.getElementById("focusSessionTabs"),
  terminalCommandInput: document.getElementById("terminalCommandInput"),
  sendCommandButton: document.getElementById("sendCommandButton"),
  terminalInputModeSelect: document.getElementById("terminalInputModeSelect"),
  terminalFontSizeSelect: document.getElementById("terminalFontSizeSelect"),

  // Files
  pathInput: document.getElementById("pathInput"),
  fileTree: document.getElementById("fileTree"),
  fileBreadcrumbs: document.getElementById("fileBreadcrumbs"),
  fileList: document.getElementById("fileList"),
  refreshFilesButton: document.getElementById("refreshFilesButton"),
  createFolderButton: document.getElementById("createFolderButton"),
  createFileButton: document.getElementById("createFileButton"),
  uploadInput: document.getElementById("uploadInput"),
  uploadFilesButton: document.getElementById("uploadFilesButton"),
  editorPathInput: document.getElementById("editorPathInput"),
  fileEditor: document.getElementById("fileEditor"),
  readFileButton: document.getElementById("readFileButton"),
  saveFileButton: document.getElementById("saveFileButton"),

  // Secondary modules
  toolInstallerList: document.getElementById("toolInstallerList"),
  oauthCallbackInput: document.getElementById("oauthCallbackInput"),
  relayCallbackButton: document.getElementById("relayCallbackButton"),
  appAccessUrl: document.getElementById("appAccessUrl"),
  staticAccessUrl: document.getElementById("staticAccessUrl"),
  openAppUrlButton: document.getElementById("openAppUrlButton"),
  copyAppUrlButton: document.getElementById("copyAppUrlButton"),
  openStaticUrlButton: document.getElementById("openStaticUrlButton"),
  copyStaticUrlButton: document.getElementById("copyStaticUrlButton")
};

const storageKeys = {
  activeTab: "ui.activeTab",
  themeMode: "ui.themeMode",
  hiddenModules: "ui.hiddenModules",
  terminalFocusMode: "ui.terminalFocusMode",
  terminalInputMode: "ui.terminalInputMode",
  terminalFontSize: "ui.terminalFontSize",
  focusSwipeHintDismissed: "ui.focusSwipeHintDismissed"
};

const uiState = {
  activeTab: localStorage.getItem(storageKeys.activeTab) || "terminal",
  themeMode: localStorage.getItem(storageKeys.themeMode) || "auto",
  hiddenModules: new Set(JSON.parse(localStorage.getItem(storageKeys.hiddenModules) || "[]")),
  terminalFocusMode: localStorage.getItem(storageKeys.terminalFocusMode) === "1",
  terminalInputMode: localStorage.getItem(storageKeys.terminalInputMode) || "command_bar",
  terminalFontSize: localStorage.getItem(storageKeys.terminalFontSize) || "auto",
  focusSwipeHintDismissed: localStorage.getItem(storageKeys.focusSwipeHintDismissed) === "1"
};

let socket = null;
let terminal = null;
let fitAddon = null;
let terminalFallbackEl = null;
let activeSessionId = null;
let isAuthenticated = false;
const sessionBuffers = new Map();
const sessionTextBuffers = new Map();
let terminalSessions = [];
const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
let lastMobileKeyDispatchAt = 0;
let lastMobileKeyDispatched = "";
let touchSwipeStartX = null;
let touchSwipeStartY = null;
let currentFilePath = ".";
const expandedTreeNodes = new Set(["."]);
const treeDirectoryCache = new Map();

const toolInstallers = [
  {
    name: "Codex CLI",
    description: "OpenAI Codex terminal CLI",
    command: "npm install -g @openai/codex"
  },
  {
    name: "Gemini CLI",
    description: "Google Gemini command-line tool",
    command: "npm install -g @google/generative-ai-cli"
  },
  {
    name: "Cline CLI",
    description: "Cline command-line package",
    command: "npm install -g cline"
  }
];

function getResolvedTheme(mode) {
  if (mode === "dark" || mode === "light") {
    return mode;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getXTermTheme(mode) {
  if (mode === "dark") {
    return {
      background: "#070b12",
      foreground: "#e2e8f0",
      cursor: "#10a37f"
    };
  }
  return {
    background: "#f8fafc",
    foreground: "#0f172a",
    cursor: "#10a37f"
  };
}

function applyTheme(mode) {
  uiState.themeMode = mode;
  localStorage.setItem(storageKeys.themeMode, mode);
  const resolved = getResolvedTheme(mode);
  document.documentElement.setAttribute("data-theme", resolved);
  if (terminal && typeof terminal.options === "object") {
    terminal.options.theme = getXTermTheme(resolved);
  }
}

function initTheme() {
  if (els.themeModeSelect) {
    els.themeModeSelect.value = uiState.themeMode;
    els.themeModeSelect.addEventListener("change", () => {
      applyTheme(els.themeModeSelect.value);
    });
  }
  applyTheme(uiState.themeMode);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", () => {
    if (uiState.themeMode === "auto") {
      applyTheme("auto");
    }
  });
}

function setActiveTab(tabName) {
  if (uiState.terminalFocusMode && tabName !== "terminal") {
    setTerminalFocusMode(false);
  }
  uiState.activeTab = tabName;
  localStorage.setItem(storageKeys.activeTab, tabName);

  const buttons = Array.from(els.tabBar?.querySelectorAll(".tab-btn") || []);
  for (const button of buttons) {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
  }

  for (const panel of els.tabPanels) {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  }
}

function setTerminalFocusMode(enabled) {
  uiState.terminalFocusMode = enabled;
  localStorage.setItem(storageKeys.terminalFocusMode, enabled ? "1" : "0");
  document.body.classList.toggle("terminal-focus-mode", enabled);
  if (enabled && isTouchDevice) {
    applyTerminalInputMode("direct_terminal");
  }
  updateFocusSwipeHintVisibility();
  if (enabled) {
    setActiveTab("terminal");
    terminal?.focus?.();
  }
}

function updateFocusSwipeHintVisibility() {
  if (!els.focusSwipeHint) {
    return;
  }
  const shouldShow =
    uiState.terminalFocusMode &&
    isTouchDevice &&
    !uiState.focusSwipeHintDismissed &&
    terminalSessions.length > 1;
  els.focusSwipeHint.classList.toggle("hidden", !shouldShow);
}

function dismissFocusSwipeHint() {
  uiState.focusSwipeHintDismissed = true;
  localStorage.setItem(storageKeys.focusSwipeHintDismissed, "1");
  updateFocusSwipeHintVisibility();
}

function updateViewportHeightVar() {
  const height = window.visualViewport?.height || window.innerHeight || 0;
  if (height > 0) {
    document.documentElement.style.setProperty("--vvh", `${height * 0.01}px`);
  }
  const baseHeight = window.innerHeight || 0;
  const keyboardLikelyOpen = baseHeight > 0 && height > 0 && baseHeight - height > 120;
  document.body.classList.toggle("keyboard-open", keyboardLikelyOpen);
}

function applyTerminalInputMode(mode) {
  const normalized = mode === "direct_terminal" ? "direct_terminal" : "command_bar";
  uiState.terminalInputMode = normalized;
  localStorage.setItem(storageKeys.terminalInputMode, normalized);
  if (els.terminalInputModeSelect) {
    els.terminalInputModeSelect.value = normalized;
  }
  document.body.classList.toggle("mobile-input-direct", normalized === "direct_terminal");
}

function getAutoTerminalFontSize() {
  return window.innerWidth <= 520 ? 11 : window.innerWidth <= 900 ? 12 : 14;
}

function applyTerminalFontSizePreset(preset) {
  const normalized = preset || "auto";
  uiState.terminalFontSize = normalized;
  localStorage.setItem(storageKeys.terminalFontSize, normalized);
  if (els.terminalFontSizeSelect) {
    els.terminalFontSizeSelect.value = normalized;
  }
  const resolvedSize = normalized === "auto" ? getAutoTerminalFontSize() : Number(normalized);
  if (terminal && typeof terminal.options === "object" && Number.isFinite(resolvedSize)) {
    terminal.options.fontSize = resolvedSize;
    if (fitAddon && typeof fitAddon.fit === "function") {
      fitAddon.fit();
    }
    sendResize();
  }
}

function initTabs() {
  const validTabs = new Set(["terminal", "files", "projects", "access", "more"]);
  if (!validTabs.has(uiState.activeTab)) {
    uiState.activeTab = "terminal";
  }
  setActiveTab(uiState.activeTab);

  const buttons = Array.from(els.tabBar?.querySelectorAll(".tab-btn") || []);
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (tab) {
        setActiveTab(tab);
      }
    });
  }
}

function persistHiddenModules() {
  localStorage.setItem(storageKeys.hiddenModules, JSON.stringify(Array.from(uiState.hiddenModules)));
}

function setModuleHidden(moduleKey, hidden) {
  if (hidden) {
    uiState.hiddenModules.add(moduleKey);
  } else {
    uiState.hiddenModules.delete(moduleKey);
  }
  persistHiddenModules();
  renderSecondaryModuleVisibility();
}

function renderSecondaryModuleVisibility() {
  const isToolHidden = uiState.hiddenModules.has("toolInstaller");
  const isNetworkHidden = uiState.hiddenModules.has("networkAccess");
  const isOAuthHidden = uiState.hiddenModules.has("oauthHelper");

  els.toolInstallerModule?.classList.toggle("module-hidden", isToolHidden);
  els.networkModule?.classList.toggle("module-hidden", isNetworkHidden);
  els.oauthModule?.classList.toggle("module-hidden", isOAuthHidden);

  if (els.toggleToolInstaller) {
    els.toggleToolInstaller.checked = !isToolHidden;
  }
  if (els.toggleNetworkAccess) {
    els.toggleNetworkAccess.checked = !isNetworkHidden;
  }
  if (els.toggleOAuthHelper) {
    els.toggleOAuthHelper.checked = !isOAuthHidden;
  }
}

function initSecondaryModuleToggles() {
  els.toggleToolInstaller?.addEventListener("change", () => {
    setModuleHidden("toolInstaller", !els.toggleToolInstaller.checked);
  });
  els.toggleNetworkAccess?.addEventListener("change", () => {
    setModuleHidden("networkAccess", !els.toggleNetworkAccess.checked);
  });
  els.toggleOAuthHelper?.addEventListener("change", () => {
    setModuleHidden("oauthHelper", !els.toggleOAuthHelper.checked);
  });
  renderSecondaryModuleVisibility();
}

function initTerminal() {
  const hasXterm = !!(window.Terminal && window.FitAddon && window.FitAddon.FitAddon);
  if (!hasXterm) {
    terminalFallbackEl = document.createElement("pre");
    terminalFallbackEl.style.margin = "0";
    terminalFallbackEl.style.whiteSpace = "pre-wrap";
    terminalFallbackEl.style.wordBreak = "break-word";
    terminalFallbackEl.style.fontFamily = "SFMono-Regular, Menlo, Consolas, monospace";
    terminalFallbackEl.style.fontSize = "13px";
    terminalFallbackEl.style.lineHeight = "1.45";
    terminalFallbackEl.style.color = "var(--terminal-fg)";
    terminalFallbackEl.style.userSelect = "text";
    terminalFallbackEl.style.webkitUserSelect = "text";
    terminalFallbackEl.textContent = "Terminal fallback active. Output will appear here.\n";
    els.terminalView.innerHTML = "";
    els.terminalView.appendChild(terminalFallbackEl);

    terminal = {
      cols: 120,
      rows: 32,
      write(data) {
        terminalFallbackEl.textContent += stripAnsiCodes(data);
        els.terminalView.scrollTop = els.terminalView.scrollHeight;
      },
      writeln(data) {
        terminalFallbackEl.textContent += `${stripAnsiCodes(data)}\n`;
        els.terminalView.scrollTop = els.terminalView.scrollHeight;
      },
      focus() {},
      reset() {
        terminalFallbackEl.textContent = "";
      }
    };
  } else {
    const mobileFontSize =
      uiState.terminalFontSize === "auto" ? getAutoTerminalFontSize() : Number(uiState.terminalFontSize) || 12;
    terminal = new window.Terminal({
      cursorBlink: true,
      fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: mobileFontSize,
      lineHeight: isTouchDevice ? 1.34 : 1.22,
      letterSpacing: isTouchDevice ? 0.2 : 0,
      theme: getXTermTheme(getResolvedTheme(uiState.themeMode))
    });

    fitAddon = new window.FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    if (window.WebLinksAddon && window.WebLinksAddon.WebLinksAddon) {
      const webLinksAddon = new window.WebLinksAddon.WebLinksAddon(
        (_event, uri) => {
          const normalized = normalizeTerminalUrl(uri);
          window.open(normalized, "_blank", "noopener,noreferrer");
        },
        {
          willLinkActivate: () => true
        }
      );
      terminal.loadAddon(webLinksAddon);
    }

    terminal.open(els.terminalView);
    fitAddon.fit();
    terminal.onData((data) => {
      sendTerminalInput(data);
    });
  }

  terminal.writeln("Remote terminal ready. Tap Connect.");

  window.addEventListener("resize", () => {
    if (!terminal || !fitAddon || typeof fitAddon.fit !== "function") {
      return;
    }
    if (uiState.terminalFontSize === "auto") {
      applyTerminalFontSizePreset("auto");
    }
    fitAddon.fit();
    sendResize();
  });
}

function normalizeTerminalUrl(uri) {
  if (!uri) {
    return uri;
  }
  const trimmed = uri.trim();
  if (trimmed.startsWith("vhttp://")) {
    return `http://${trimmed.slice("vhttp://".length)}`;
  }
  if (trimmed.startsWith("vhttps://")) {
    return `https://${trimmed.slice("vhttps://".length)}`;
  }
  return trimmed;
}

function getNetworkAccessUrls(hostnameOverride) {
  const protocol = window.location.protocol;
  const host = hostnameOverride || window.location.hostname;
  const appPort = window.location.port || (protocol === "https:" ? "443" : "80");
  const appUrl = `${protocol}//${host}:${appPort}`;
  const staticUrl = `${protocol}//${host}:8000/index.html`;
  return { appUrl, staticUrl };
}
async function detectLanIPv4() {
  const isLocalHost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!isLocalHost || !window.RTCPeerConnection) {
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 1500);

    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("lan-ip-detect");

    pc.onicecandidate = (event) => {
      const candidate = event?.candidate?.candidate;
      if (!candidate) {
        return;
      }

      const match = candidate.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
      if (!match) {
        return;
      }
      const ip = match[1];
      if (ip.startsWith("127.") || ip === "0.0.0.0") {
        return;
      }

      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(ip);
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
  });
}

async function initNetworkAccess() {
  if (!els.appAccessUrl || !els.staticAccessUrl) {
    return;
  }

  let lanIp = null;
  try {
    const configData = await api("/api/network/config");
    if (configData.localLanIp && typeof configData.localLanIp === "string") {
      lanIp = configData.localLanIp.trim() || null;
    }
  } catch {
    // Fallback to browser detection below.
  }

  if (!lanIp) {
    lanIp = await detectLanIPv4();
  }

  const { appUrl, staticUrl } = getNetworkAccessUrls(lanIp);
  els.appAccessUrl.value = appUrl;
  els.staticAccessUrl.value = staticUrl;

  if (!els.openAppUrlButton.dataset.bound) {
    els.openAppUrlButton.dataset.bound = "1";
    els.openAppUrlButton.addEventListener("click", () => {
      window.open(els.appAccessUrl.value, "_blank", "noopener,noreferrer");
    });
  }
  if (!els.copyAppUrlButton.dataset.bound) {
    els.copyAppUrlButton.dataset.bound = "1";
    els.copyAppUrlButton.addEventListener("click", () => copyText(els.appAccessUrl.value));
  }
  if (!els.openStaticUrlButton.dataset.bound) {
    els.openStaticUrlButton.dataset.bound = "1";
    els.openStaticUrlButton.addEventListener("click", () => {
      window.open(els.staticAccessUrl.value, "_blank", "noopener,noreferrer");
    });
  }
  if (!els.copyStaticUrlButton.dataset.bound) {
    els.copyStaticUrlButton.dataset.bound = "1";
    els.copyStaticUrlButton.addEventListener("click", () => copyText(els.staticAccessUrl.value));
  }
}

function clearTerminalView() {
  if (!terminal) {
    return;
  }
  if (typeof terminal.reset === "function") {
    terminal.reset();
    return;
  }
  if (typeof terminal.clear === "function") {
    terminal.clear();
  }
}

function stripAnsiCodes(input) {
  if (typeof input !== "string") {
    return String(input ?? "");
  }
  return input.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1B\][^\x07]*\x07/g, "");
}

function setStatus(status) {
  els.statusBadge.className = `status ${status}`;
  els.statusBadge.textContent = status;
  if (els.focusStatusBadge) {
    els.focusStatusBadge.className = `status ${status}`;
    els.focusStatusBadge.textContent = status;
  }
}

function termSystem(message) {
  if (!terminal) {
    return;
  }
  terminal.writeln(`\r\n[system] ${message}`);
}

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { "Content-Type": "application/json" };
  const response = await fetch(path, {
    headers: { ...defaultHeaders, ...(options.headers || {}) },
    ...options
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data.message || data.error || "Request failed";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

function setAuthStatus(label, authenticated) {
  isAuthenticated = authenticated;
  if (els.authStatusLabel) {
    els.authStatusLabel.textContent = label;
  }
}

function requireAuthGuard() {
  if (isAuthenticated) {
    return true;
  }
  termSystem("login required");
  setActiveTab("access");
  return false;
}

async function fetchSessionStatus() {
  try {
    const data = await api("/api/auth/session");
    if (data.authenticated) {
      setAuthStatus(`authenticated as ${data.actorId}`, true);
      return true;
    }
    setAuthStatus("not authenticated", false);
    return false;
  } catch (error) {
    if (error.status === 401) {
      setAuthStatus("not authenticated", false);
      return false;
    }
    termSystem(`session check failed: ${error.message}`);
    return false;
  }
}

async function login() {
  const password = (els.loginPasswordInput.value || "").trim();
  if (!password) {
    setAuthStatus("password is required", false);
    return;
  }

  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    els.loginPasswordInput.value = "";
    setAuthStatus("authenticated as admin", true);
    termSystem("login successful");
    await initNetworkAccess();
    await refreshProjects();
    await refreshFiles(".");
    await refreshWorkspaceFolderPicker();
    await ensureTreeNode(".");
    renderFileTree();
    setActiveTab("terminal");
  } catch (error) {
    setAuthStatus(`login failed: ${error.message}`, false);
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
  } catch {
    // Ignore logout errors.
  }
  closeTerminalSocket();
  setAuthStatus("not authenticated", false);
  setActiveTab("access");
}

function closeTerminalSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
  activeSessionId = null;
  terminalSessions = [];
  sessionBuffers.clear();
  sessionTextBuffers.clear();
  renderSessionTabs();
}

function sendTerminalInput(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !activeSessionId) {
    return;
  }
  socket.send(JSON.stringify({ type: "input", sessionId: activeSessionId, data }));
}

function sendResize() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !terminal || !activeSessionId) {
    return;
  }

  const cols = Number(terminal.cols || 120);
  const rows = Number(terminal.rows || 32);
  socket.send(JSON.stringify({ type: "resize", sessionId: activeSessionId, cols, rows }));
}

function connectTerminal() {
  if (!requireAuthGuard()) {
    return;
  }
  closeTerminalSocket();

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);
  setStatus("running");

  socket.onopen = () => {
    createSession();
    setTimeout(() => {
      if (fitAddon && typeof fitAddon.fit === "function") {
        fitAddon.fit();
      }
      sendResize();
      terminal.focus();
    }, 120);
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "output") {
        const sid = payload.sessionId;
        const existing = sessionBuffers.get(sid) ?? "";
        sessionBuffers.set(sid, `${existing}${payload.data}`);
        const existingText = sessionTextBuffers.get(sid) ?? "";
        sessionTextBuffers.set(sid, `${existingText}${stripAnsiCodes(payload.data)}`);
        if (sid === activeSessionId) {
          terminal.write(payload.data);
          renderTerminalTextMirror(sid);
        }
      }
      if (payload.type === "status") {
        if (payload.status === "started") {
          if (payload.sessionId && !sessionBuffers.has(payload.sessionId)) {
            sessionBuffers.set(payload.sessionId, "");
          }
          if (payload.sessionId && !sessionTextBuffers.has(payload.sessionId)) {
            sessionTextBuffers.set(payload.sessionId, "");
          }
          els.terminalCwdLabel.textContent = `cwd: ${payload.cwd}`;
          if (els.focusCwdLabel) {
            els.focusCwdLabel.textContent = `cwd: ${payload.cwd}`;
          }
          setStatus("running");
          if (payload.sessionId === activeSessionId) {
            termSystem(`terminal started in ${payload.cwd}`);
          }
        } else if (payload.status === "stopped") {
          if (payload.sessionId === activeSessionId) {
            setStatus("idle");
            termSystem("terminal stopped");
          }
        } else if (payload.status === "error") {
          setStatus("failed");
          termSystem(payload.message || "terminal error");
        } else if (payload.status === "switched") {
          setStatus("running");
        }
      }
      if (payload.type === "session_list") {
        terminalSessions = payload.sessions ?? [];
        activeSessionId = payload.activeSessionId ?? null;
        renderSessionTabs();
        renderActiveSessionBuffer();
      }
      if (payload.type === "session_closed") {
        sessionBuffers.delete(payload.sessionId);
        sessionTextBuffers.delete(payload.sessionId);
      }
    } catch {
      terminal.write(event.data);
    }
  };

  socket.onclose = () => {
    setStatus("idle");
    els.terminalCwdLabel.textContent = "cwd: not connected";
    if (els.focusCwdLabel) {
      els.focusCwdLabel.textContent = "cwd: not connected";
    }
  };

  socket.onerror = () => {
    setStatus("failed");
    termSystem("websocket connection failed");
  };
}
function createSession() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  const cwd = els.cwdInput.value.trim() || ".";
  socket.send(
    JSON.stringify({
      type: "create_session",
      cwd,
      cols: Number(terminal?.cols || 120),
      rows: Number(terminal?.rows || 32)
    })
  );
}

function switchSession(sessionId) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify({ type: "switch_session", sessionId }));
}

function switchSessionByDelta(delta) {
  if (!terminalSessions.length || !activeSessionId) {
    return;
  }
  const currentIndex = terminalSessions.findIndex((s) => s.id === activeSessionId);
  if (currentIndex < 0) {
    return;
  }
  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= terminalSessions.length) {
    return;
  }
  switchSession(terminalSessions[nextIndex].id);
}

function closeActiveSession() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !activeSessionId) {
    return;
  }
  socket.send(JSON.stringify({ type: "close_session", sessionId: activeSessionId }));
}

function renderSessionTabs() {
  const renderContainer = (container, compact = false) => {
    if (!container) {
      return;
    }
    container.innerHTML = "";
    for (let i = 0; i < terminalSessions.length; i += 1) {
      const session = terminalSessions[i];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `session-tab ${session.id === activeSessionId ? "active" : ""} ${compact ? "compact" : ""}`;
      btn.textContent = `S${i + 1}`;
      btn.title = session.cwd;
      btn.addEventListener("click", () => switchSession(session.id));
      container.appendChild(btn);
    }
  };

  renderContainer(els.sessionTabs, false);
  renderContainer(els.focusSessionTabs, true);
  updateFocusSwipeHintVisibility();
}

function renderActiveSessionBuffer() {
  clearTerminalView();
  if (!activeSessionId) {
    terminal.writeln("No active session. Tap New Session.");
    renderTerminalTextMirror(null);
    return;
  }
  const content = sessionBuffers.get(activeSessionId) ?? "";
  if (content) {
    terminal.write(content);
  }
  renderTerminalTextMirror(activeSessionId);
  const session = terminalSessions.find((s) => s.id === activeSessionId);
  if (session?.cwd) {
    els.terminalCwdLabel.textContent = `cwd: ${session.cwd}`;
    if (els.focusCwdLabel) {
      els.focusCwdLabel.textContent = `cwd: ${session.cwd}`;
    }
  }
}

function renderTerminalTextMirror(sessionId) {
  if (!els.terminalTextMirror) {
    return;
  }
  if (!sessionId) {
    els.terminalTextMirror.textContent = "";
    return;
  }
  els.terminalTextMirror.textContent = sessionTextBuffers.get(sessionId) ?? "";
  els.terminalTextMirror.scrollTop = els.terminalTextMirror.scrollHeight;
}

function sendCommandFromInput() {
  const command = els.terminalCommandInput.value.trim();
  if (!command) {
    return;
  }
  sendTerminalInput(`${command}\r`);
  els.terminalCommandInput.value = "";
  if (!isTouchDevice) {
    terminal.focus();
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    termSystem("copied to clipboard");
  } catch {
    termSystem("clipboard copy failed");
  }
}

function runPreparedCommand(command) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !activeSessionId) {
    termSystem("connect terminal first to run installer command");
    return;
  }
  sendTerminalInput(`${command}\r`);
  termSystem(`running installer command: ${command}`);
}

function sendSpecialKey(key) {
  const map = {
    up: "\x1b[A",
    down: "\x1b[B",
    right: "\x1b[C",
    left: "\x1b[D",
    enter: "\r",
    tab: "\t",
    shiftTab: "\x1b[Z",
    esc: "\x1b",
    backspace: "\x7f",
    ctrlc: "\x03"
  };

  const seq = map[key];
  if (seq) {
    sendTerminalInput(seq);
    if (!isTouchDevice) {
      terminal.focus();
    }
  }
}

async function pasteFromClipboardToTerminal() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !activeSessionId) {
    termSystem("connect terminal first");
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      return;
    }
    sendTerminalInput(text);
  } catch {
    termSystem("clipboard paste failed");
  }
}

function clearTerminalQuickAction() {
  if (socket && socket.readyState === WebSocket.OPEN && activeSessionId) {
    sendTerminalInput("clear\r");
    return;
  }
  clearTerminalView();
}

function dispatchMobileSpecialKey(key) {
  if (!key) {
    return;
  }
  sendSpecialKey(key);
  lastMobileKeyDispatched = key;
  lastMobileKeyDispatchAt = Date.now();
}

function shouldSkipMobileClick(key) {
  if (!isTouchDevice || !key) {
    return false;
  }
  return lastMobileKeyDispatched === key && Date.now() - lastMobileKeyDispatchAt < 700;
}

function isImageFile(name) {
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name);
}

function joinPath(base, name) {
  return base === "." ? name : `${base}/${name}`;
}

function pathSegments(pathValue) {
  if (!pathValue || pathValue === ".") {
    return ["."];
  }
  return pathValue.split("/").filter(Boolean);
}

function normalizeRelativePath(pathValue) {
  const value = (pathValue || ".").trim();
  if (!value || value === "/") {
    return ".";
  }
  return value.replace(/^\/+/, "");
}

function setCwdValue(cwd) {
  const normalized = normalizeRelativePath(cwd);
  els.cwdInput.value = normalized;
  syncCwdFolderSelect(normalized);
}

function syncCwdFolderSelect(cwd) {
  if (!els.cwdFolderSelect) {
    return;
  }
  const normalized = normalizeRelativePath(cwd);
  const existing = Array.from(els.cwdFolderSelect.options).find((opt) => opt.value === normalized);
  if (!existing) {
    const custom = document.createElement("option");
    custom.value = normalized;
    custom.textContent = `${normalized} (custom)`;
    els.cwdFolderSelect.appendChild(custom);
  }
  els.cwdFolderSelect.value = normalized;
}

async function refreshWorkspaceFolderPicker(selectedCwd = null) {
  if (!els.cwdFolderSelect || !requireAuthGuard()) {
    return;
  }
  const data = await api("/api/files?path=.");
  const folders = (data.entries || []).filter((entry) => entry.type === "dir").map((entry) => entry.name);
  const current = normalizeRelativePath(selectedCwd || els.cwdInput.value || ".");

  els.cwdFolderSelect.innerHTML = "";
  const rootOption = document.createElement("option");
  rootOption.value = ".";
  rootOption.textContent = "workspace (.)";
  els.cwdFolderSelect.appendChild(rootOption);

  for (const folder of folders) {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    els.cwdFolderSelect.appendChild(option);
  }

  syncCwdFolderSelect(current);
}

async function createWorkspaceFolderFromPicker() {
  if (!requireAuthGuard()) {
    return;
  }
  const folderName = window.prompt("New folder name in workspace:");
  if (!folderName) {
    return;
  }
  const trimmed = folderName.trim();
  if (!trimmed) {
    return;
  }

  try {
    await api("/api/files/mkdir", {
      method: "POST",
      body: JSON.stringify({ path: trimmed })
    });
    termSystem(`created workspace folder ${trimmed}`);
    await refreshWorkspaceFolderPicker(trimmed);
    setCwdValue(trimmed);
  } catch (error) {
    termSystem(`create folder error: ${error.message}`);
  }
}

function makeButton(label, onClick, className = "secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderToolInstaller() {
  if (!els.toolInstallerList) {
    return;
  }
  els.toolInstallerList.innerHTML = "";
  for (const tool of toolInstallers) {
    const card = document.createElement("article");
    card.className = "tool-card";

    const title = document.createElement("h3");
    title.textContent = tool.name;
    const desc = document.createElement("p");
    desc.textContent = tool.description;

    const actions = document.createElement("div");
    actions.className = "row wrap";
    actions.append(
      makeButton("Copy Command", () => copyText(tool.command)),
      makeButton("Run in Terminal", () => runPreparedCommand(tool.command))
    );

    card.append(title, desc, actions);
    els.toolInstallerList.appendChild(card);
  }
}

async function relayOAuthCallback() {
  if (!requireAuthGuard()) {
    return;
  }
  const callbackUrl = (els.oauthCallbackInput.value || "").trim();
  if (!callbackUrl) {
    termSystem("paste callback URL first");
    return;
  }

  try {
    const result = await api("/api/oauth/relay-callback", {
      method: "POST",
      body: JSON.stringify({ callbackUrl })
    });

    if (result.ok) {
      termSystem("OAuth callback relayed successfully. Run 'codex login status'.");
    } else {
      termSystem(
        `OAuth relay responded with status ${result.status}. You can still run 'codex login status'.`
      );
    }
  } catch (error) {
    termSystem(`OAuth relay error: ${error.message}`);
  }
}

function renderBreadcrumbs(pathValue) {
  if (!els.fileBreadcrumbs) {
    return;
  }
  els.fileBreadcrumbs.innerHTML = "";

  const segments = pathSegments(pathValue);
  if (segments.length === 1 && segments[0] === ".") {
    const rootBtn = document.createElement("button");
    rootBtn.type = "button";
    rootBtn.textContent = "workspace";
    rootBtn.addEventListener("click", () => {
      openFolderPath(".");
    });
    els.fileBreadcrumbs.appendChild(rootBtn);
    return;
  }

  const rootBtn = document.createElement("button");
  rootBtn.type = "button";
  rootBtn.textContent = "workspace";
  rootBtn.addEventListener("click", () => openFolderPath("."));
  els.fileBreadcrumbs.appendChild(rootBtn);

  let cursor = "";
  for (const part of segments) {
    cursor = cursor ? `${cursor}/${part}` : part;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = part;
    btn.addEventListener("click", () => openFolderPath(cursor));
    els.fileBreadcrumbs.appendChild(btn);
  }
}

async function ensureTreeNode(pathValue) {
  const pathKey = normalizeRelativePath(pathValue);
  if (treeDirectoryCache.has(pathKey)) {
    return;
  }
  const data = await api(`/api/files?path=${encodeURIComponent(pathKey)}`);
  const dirs = (data.entries || []).filter((e) => e.type === "dir").map((e) => e.name);
  treeDirectoryCache.set(pathKey, dirs);
}

async function toggleTreeNode(pathValue) {
  const pathKey = normalizeRelativePath(pathValue);
  if (expandedTreeNodes.has(pathKey)) {
    expandedTreeNodes.delete(pathKey);
    if (pathKey === ".") {
      expandedTreeNodes.add(".");
    }
    renderFileTree();
    return;
  }

  expandedTreeNodes.add(pathKey);
  try {
    await ensureTreeNode(pathKey);
  } catch (error) {
    termSystem(`tree load error: ${error.message}`);
  }
  renderFileTree();
}
function renderTreeBranch(pathValue, depth = 0) {
  const list = document.createElement("ul");
  list.className = "file-tree";
  list.style.paddingLeft = `${depth * 12}px`;

  const dirs = treeDirectoryCache.get(pathValue) || [];
  for (const dirName of dirs) {
    const fullPath = pathValue === "." ? dirName : `${pathValue}/${dirName}`;
    const li = document.createElement("li");

    const row = document.createElement("div");
    row.className = "tree-node";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tree-toggle";
    const isExpanded = expandedTreeNodes.has(fullPath);
    toggle.textContent = isExpanded ? "-" : "+";
    toggle.addEventListener("click", async () => {
      await toggleTreeNode(fullPath);
    });

    const label = document.createElement("button");
    label.type = "button";
    label.className = `tree-label ${currentFilePath === fullPath ? "active" : ""}`;
    label.textContent = dirName;
    label.addEventListener("click", () => {
      openFolderPath(fullPath);
    });

    row.append(toggle, label);
    li.appendChild(row);

    if (isExpanded) {
      li.appendChild(renderTreeBranch(fullPath, depth + 1));
    }

    list.appendChild(li);
  }

  return list;
}

function renderFileTree() {
  if (!els.fileTree) {
    return;
  }

  els.fileTree.innerHTML = "";

  const rootLi = document.createElement("li");
  const rootRow = document.createElement("div");
  rootRow.className = "tree-node";

  const rootToggle = document.createElement("button");
  rootToggle.type = "button";
  rootToggle.className = "tree-toggle";
  rootToggle.textContent = expandedTreeNodes.has(".") ? "-" : "+";
  rootToggle.addEventListener("click", async () => {
    await toggleTreeNode(".");
  });

  const rootLabel = document.createElement("button");
  rootLabel.type = "button";
  rootLabel.className = `tree-label ${currentFilePath === "." ? "active" : ""}`;
  rootLabel.textContent = "workspace";
  rootLabel.addEventListener("click", () => {
    openFolderPath(".");
  });

  rootRow.append(rootToggle, rootLabel);
  rootLi.appendChild(rootRow);

  if (expandedTreeNodes.has(".")) {
    rootLi.appendChild(renderTreeBranch(".", 1));
  }

  els.fileTree.appendChild(rootLi);
}

async function openFolderPath(pathValue) {
  const normalized = normalizeRelativePath(pathValue);
  currentFilePath = normalized;
  els.pathInput.value = normalized;
  renderBreadcrumbs(normalized);
  await refreshFiles(normalized);
}

async function refreshFiles(pathOverride = null) {
  if (!requireAuthGuard()) {
    return;
  }

  const targetPath = normalizeRelativePath(pathOverride || els.pathInput.value || currentFilePath);
  currentFilePath = targetPath;
  els.pathInput.value = targetPath;

  try {
    const data = await api(`/api/files?path=${encodeURIComponent(targetPath)}`);
    els.fileList.innerHTML = "";

    renderBreadcrumbs(targetPath);

    const dirs = [];
    for (const entry of data.entries) {
      if (entry.type === "dir") {
        dirs.push(entry.name);
      }

      const li = document.createElement("li");
      li.className = "file-item";

      const primary = document.createElement("button");
      primary.type = "button";
      primary.className = "file-row-click";
      primary.innerHTML = `<span class=\"file-name\">${entry.type === "dir" ? "[dir] " : ""}${entry.name}</span><br><span class=\"msg\">${entry.type} | ${entry.size} bytes</span>`;
      li.appendChild(primary);

      if (entry.type === "dir") {
        const dirPath = joinPath(targetPath, entry.name);
        primary.addEventListener("click", () => {
          expandedTreeNodes.add(targetPath);
          expandedTreeNodes.add(dirPath);
          openFolderPath(dirPath);
        });
      } else {
        const filePath = joinPath(targetPath, entry.name);
        primary.addEventListener("click", () => {
          els.editorPathInput.value = filePath;
          if (isImageFile(entry.name)) {
            window.open(`/api/files/download?path=${encodeURIComponent(filePath)}`, "_blank");
          } else {
            readFileIntoEditor();
          }
        });
      }

      const actions = document.createElement("details");
      actions.className = "group";
      const summary = document.createElement("summary");
      summary.textContent = "Actions";
      actions.appendChild(summary);

      const actionRow = document.createElement("div");
      actionRow.className = "row wrap";

      if (entry.type === "dir") {
        const dirPath = joinPath(targetPath, entry.name);
        actionRow.append(
          makeButton("Open", () => openFolderPath(dirPath)),
          makeButton("Delete", async () => {
            const recursive = window.confirm(
              `Delete folder \"${dirPath}\" recursively?\nPress OK for recursive delete, Cancel to abort.`
            );
            if (recursive) {
              await deletePathItem(dirPath, true);
            }
          })
        );
      } else {
        const filePath = joinPath(targetPath, entry.name);
        actionRow.append(
          makeButton("Edit", () => {
            els.editorPathInput.value = filePath;
            readFileIntoEditor();
          }),
          makeButton("Download", () => {
            window.open(`/api/files/download?path=${encodeURIComponent(filePath)}`, "_blank");
          }),
          makeButton("Delete", async () => {
            const ok = window.confirm(`Delete file \"${filePath}\"?`);
            if (ok) {
              await deletePathItem(filePath, false);
            }
          })
        );
      }

      actions.appendChild(actionRow);
      li.appendChild(actions);
      els.fileList.appendChild(li);
    }

    treeDirectoryCache.set(targetPath, dirs);
    renderFileTree();
  } catch (error) {
    if (error.status === 401) {
      setAuthStatus("not authenticated", false);
      return;
    }
    termSystem(`files error: ${error.message}`);
  }
}

async function deletePathItem(pathValue, recursive) {
  if (!requireAuthGuard()) {
    return;
  }
  try {
    await api("/api/files/delete", {
      method: "POST",
      body: JSON.stringify({ path: pathValue, recursive })
    });
    termSystem(`deleted ${pathValue}`);
    treeDirectoryCache.clear();
    await ensureTreeNode(".");
    renderFileTree();
    await refreshWorkspaceFolderPicker();
    await refreshFiles(currentFilePath);
  } catch (error) {
    termSystem(`delete error: ${error.message}`);
  }
}

async function readFileIntoEditor() {
  if (!requireAuthGuard()) {
    return;
  }
  const editorPath = (els.editorPathInput.value || "").trim();
  if (!editorPath) {
    termSystem("editor path is required");
    return;
  }

  if (isImageFile(editorPath)) {
    window.open(`/api/files/download?path=${encodeURIComponent(editorPath)}`, "_blank");
    termSystem("image opened in new tab");
    return;
  }

  try {
    const data = await api("/api/files/read", {
      method: "POST",
      body: JSON.stringify({ path: editorPath })
    });
    els.fileEditor.value = data.content;
  } catch (error) {
    termSystem(`read error: ${error.message}`);
  }
}

async function saveEditorFile() {
  if (!requireAuthGuard()) {
    return;
  }
  const editorPath = (els.editorPathInput.value || "").trim();
  if (!editorPath) {
    termSystem("editor path is required");
    return;
  }

  try {
    const result = await api("/api/files/write", {
      method: "POST",
      body: JSON.stringify({ path: editorPath, content: els.fileEditor.value })
    });
    termSystem(`saved ${result.path} (${result.bytes} bytes)`);
    treeDirectoryCache.clear();
    await ensureTreeNode(".");
    renderFileTree();
    await refreshFiles(currentFilePath);
  } catch (error) {
    termSystem(`save error: ${error.message}`);
  }
}

async function createFolder() {
  if (!requireAuthGuard()) {
    return;
  }
  const basePath = normalizeRelativePath(els.pathInput.value || currentFilePath);
  const folderName = window.prompt("Folder name (relative to current path):");
  if (!folderName) {
    return;
  }

  const target = joinPath(basePath, folderName);
  try {
    await api("/api/files/mkdir", {
      method: "POST",
      body: JSON.stringify({ path: target })
    });
    termSystem(`created folder ${target}`);
    treeDirectoryCache.clear();
    await ensureTreeNode(".");
    renderFileTree();
    await refreshWorkspaceFolderPicker(basePath);
    await refreshFiles(basePath);
  } catch (error) {
    termSystem(`mkdir error: ${error.message}`);
  }
}

async function createFile() {
  if (!requireAuthGuard()) {
    return;
  }
  const basePath = normalizeRelativePath(els.pathInput.value || currentFilePath);
  const fileName = window.prompt("File name (relative to current path):");
  if (!fileName) {
    return;
  }

  const target = joinPath(basePath, fileName);
  try {
    await api("/api/files/touch", {
      method: "POST",
      body: JSON.stringify({ path: target })
    });
    termSystem(`created file ${target}`);
    await refreshFiles(basePath);
  } catch (error) {
    termSystem(`touch error: ${error.message}`);
  }
}

async function uploadFiles() {
  if (!requireAuthGuard()) {
    return;
  }
  const files = els.uploadInput.files;
  if (!files || files.length === 0) {
    termSystem("select one or more files to upload");
    return;
  }

  const basePath = normalizeRelativePath(els.pathInput.value || currentFilePath);
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  try {
    const result = await api(`/api/files/upload?path=${encodeURIComponent(basePath)}`, {
      method: "POST",
      body: formData
    });
    termSystem(`uploaded: ${result.uploaded.join(", ")}`);
    els.uploadInput.value = "";
    treeDirectoryCache.clear();
    await ensureTreeNode(".");
    renderFileTree();
    await refreshFiles(basePath);
  } catch (error) {
    termSystem(`upload error: ${error.message}`);
  }
}
function renderProjects(projects, defaultCwd = null) {
  if (!els.projectList) {
    return;
  }
  els.projectList.innerHTML = "";
  for (const project of projects) {
    const row = document.createElement("article");
    row.className = "project-row";

    const title = document.createElement("h3");
    title.textContent = project.name;

    const meta = document.createElement("p");
    meta.className = "msg";
    meta.textContent = `${project.repoUrl} | ${project.branch || "default"} | updated ${new Date(project.updatedAt).toLocaleString()}`;

    const pathInfo = document.createElement("p");
    pathInfo.className = "msg";
    pathInfo.textContent = `path: ${project.localPath}${defaultCwd === project.localPath ? " (active)" : ""}`;

    const actions = document.createElement("div");
    actions.className = "row wrap";

    const openBtn = makeButton("Open", async () => {
      try {
        const result = await api("/api/projects/open", {
          method: "POST",
          body: JSON.stringify({ projectId: project.id })
        });
        const nextCwd = result.cwd || ".";
        setCwdValue(nextCwd);
        currentFilePath = nextCwd;
        els.pathInput.value = nextCwd;
        await refreshFiles(nextCwd);
        termSystem(`opened project ${project.name}`);
      } catch (error) {
        termSystem(`open project error: ${error.message}`);
      }
    });

    const pullBtn = makeButton("Pull", async () => {
      try {
        await api("/api/projects/pull", {
          method: "POST",
          body: JSON.stringify({ projectId: project.id })
        });
        termSystem(`pulled project ${project.name}`);
        await refreshProjects();
      } catch (error) {
        termSystem(`pull project error: ${error.message}`);
      }
    });

    actions.append(openBtn, pullBtn);
    row.append(title, meta, pathInfo, actions);
    els.projectList.appendChild(row);
  }
}

async function refreshProjects() {
  if (!requireAuthGuard()) {
    return;
  }
  try {
    const data = await api("/api/projects");
    renderProjects(data.projects || [], data.defaultCwd || null);
    if (data.defaultCwd) {
      setCwdValue(data.defaultCwd);
      currentFilePath = data.defaultCwd;
      els.pathInput.value = data.defaultCwd;
    }
  } catch (error) {
    if (error.status === 401) {
      setAuthStatus("not authenticated", false);
      return;
    }
    termSystem(`projects error: ${error.message}`);
  }
}

async function cloneProjectFromForm() {
  if (!requireAuthGuard()) {
    return;
  }
  const repoUrl = (els.projectRepoUrlInput.value || "").trim();
  const branch = (els.projectBranchInput.value || "").trim();
  const folderName = (els.projectFolderInput.value || "").trim();
  if (!repoUrl) {
    termSystem("repo URL is required");
    return;
  }

  try {
    await api("/api/projects/clone", {
      method: "POST",
      body: JSON.stringify({
        repoUrl,
        branch: branch || undefined,
        folderName: folderName || undefined
      })
    });
    termSystem("project cloned successfully");
    await refreshProjects();
    treeDirectoryCache.clear();
    await ensureTreeNode(".");
    renderFileTree();
    await refreshFiles(currentFilePath);
  } catch (error) {
    termSystem(`clone project error: ${error.message}`);
  }
}

function bindTerminalControls() {
  els.dismissFocusSwipeHintButton?.addEventListener("click", dismissFocusSwipeHint);
  els.terminalInputModeSelect?.addEventListener("change", () => {
    applyTerminalInputMode(els.terminalInputModeSelect.value);
  });
  els.terminalFontSizeSelect?.addEventListener("change", () => {
    applyTerminalFontSizePreset(els.terminalFontSizeSelect.value);
  });
  els.enterTerminalFocusModeButton?.addEventListener("click", () => {
    setTerminalFocusMode(true);
  });
  els.exitTerminalFocusModeButton?.addEventListener("click", () => {
    setTerminalFocusMode(false);
  });
  els.cwdFolderSelect?.addEventListener("change", () => {
    setCwdValue(els.cwdFolderSelect.value);
  });
  els.createCwdFolderButton?.addEventListener("click", createWorkspaceFolderFromPicker);
  els.cwdInput?.addEventListener("change", () => {
    syncCwdFolderSelect(els.cwdInput.value);
  });
  els.connectTerminalButton.addEventListener("click", connectTerminal);
  els.restartTerminalButton.addEventListener("click", connectTerminal);
  els.focusTerminalButton.addEventListener("click", () => terminal.focus());
  els.newSessionButton.addEventListener("click", createSession);
  els.closeSessionButton.addEventListener("click", closeActiveSession);
  els.sendCommandButton.addEventListener("click", sendCommandFromInput);
  els.focusPasteButton?.addEventListener("click", pasteFromClipboardToTerminal);
  els.focusCtrlCButton?.addEventListener("click", () => sendSpecialKey("ctrlc"));
  els.focusClearButton?.addEventListener("click", clearTerminalQuickAction);
  els.focusReconnectButton?.addEventListener("click", connectTerminal);
  els.terminalCommandInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendCommandFromInput();
    }
  });

  if (isTouchDevice && els.terminalView) {
    els.terminalView.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches?.[0];
        if (!touch) {
          return;
        }
        touchSwipeStartX = touch.clientX;
        touchSwipeStartY = touch.clientY;
      },
      { passive: true }
    );

    els.terminalView.addEventListener(
      "touchend",
      (event) => {
        if (!uiState.terminalFocusMode || terminalSessions.length < 2) {
          touchSwipeStartX = null;
          touchSwipeStartY = null;
          return;
        }

        const touch = event.changedTouches?.[0];
        if (!touch || touchSwipeStartX === null || touchSwipeStartY === null) {
          touchSwipeStartX = null;
          touchSwipeStartY = null;
          return;
        }

        const dx = touch.clientX - touchSwipeStartX;
        const dy = touch.clientY - touchSwipeStartY;
        touchSwipeStartX = null;
        touchSwipeStartY = null;

        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < 56 || absX < absY * 1.25 || absY > 44) {
          return;
        }

        if (dx < 0) {
          switchSessionByDelta(1);
        } else {
          switchSessionByDelta(-1);
        }
      },
      { passive: true }
    );
  }

  document.querySelectorAll(".mobile-keys button[data-key]").forEach((button) => {
    const key = button.dataset.key;

    if ("PointerEvent" in window) {
      button.addEventListener("pointerup", (event) => {
        if (event.pointerType === "mouse") {
          return;
        }
        dispatchMobileSpecialKey(key);
      });
    } else {
      button.addEventListener(
        "touchend",
        (event) => {
          event.preventDefault();
          dispatchMobileSpecialKey(key);
        },
        { passive: false }
      );
    }

    button.addEventListener(
      "click",
      () => {
        if (shouldSkipMobileClick(key)) {
          return;
        }
        dispatchMobileSpecialKey(key);
      },
      { passive: false }
    );
  });
}

function bindFileControls() {
  els.refreshFilesButton.addEventListener("click", () => refreshFiles(currentFilePath));
  els.createFolderButton.addEventListener("click", createFolder);
  els.createFileButton.addEventListener("click", createFile);
  els.uploadFilesButton.addEventListener("click", uploadFiles);
  els.readFileButton.addEventListener("click", readFileIntoEditor);
  els.saveFileButton.addEventListener("click", saveEditorFile);
  els.pathInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      openFolderPath(els.pathInput.value);
    }
  });
}

function bindAccessAndProjectControls() {
  els.relayCallbackButton.addEventListener("click", relayOAuthCallback);
  els.loginButton?.addEventListener("click", login);
  els.logoutButton?.addEventListener("click", logout);
  els.cloneProjectButton?.addEventListener("click", cloneProjectFromForm);
  els.loginPasswordInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });
}

async function bootstrapData() {
  const authenticated = await fetchSessionStatus();
  if (!authenticated) {
    termSystem("Login required. Enter password in Access tab.");
    setActiveTab("access");
    return;
  }

  await initNetworkAccess();
  await refreshWorkspaceFolderPicker();
  await ensureTreeNode(".");
  renderFileTree();
  await refreshProjects();
  await refreshFiles(currentFilePath);
}

if (isTouchDevice) {
  document.body.classList.add("touch-device");
}
updateViewportHeightVar();
window.addEventListener("resize", updateViewportHeightVar);
window.visualViewport?.addEventListener("resize", updateViewportHeightVar);
window.visualViewport?.addEventListener("scroll", updateViewportHeightVar);

initTheme();
initTabs();
initSecondaryModuleToggles();
initTerminal();
renderToolInstaller();
setStatus("idle");
applyTerminalInputMode(uiState.terminalInputMode);
applyTerminalFontSizePreset(uiState.terminalFontSize);
setTerminalFocusMode(uiState.terminalFocusMode);
bindTerminalControls();
bindFileControls();
bindAccessAndProjectControls();

void bootstrapData();
