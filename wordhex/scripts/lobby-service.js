const STORAGE_KEY = "wordhex:lobbies";
const PROFILE_KEY = "wordhex:player-profile";
const CHANNEL_NAME = "wordhex:lobby-sync";

const defaultLobbySettings = {
  mode: "Competitive Draft",
  rounds: 5,
  roundDuration: 30,
  winCondition: "Highest score after 5 rounds",
  dictionary: "Tournament (NA)",
  channel: "#spellcast-practice",
  maxPlayers: 6
};

const hasStorage = () => {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch (error) {
    console.warn("localStorage is unavailable", error);
    return false;
  }
};

const storageAvailable = hasStorage();
const broadcastChannel = typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

const clone = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const readLobbies = () => {
  if (!storageAvailable) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
};

const writeLobbies = (lobbies) => {
  if (!storageAvailable) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lobbies));
  notifyLobbyListListeners(lobbies);
};

const randomId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `player-${Math.random().toString(16).slice(2)}`;
};

const generateLobbyCode = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

const lobbyListListeners = new Set();
const lobbyListeners = new Map();

const notifyLobbyListListeners = (lobbies = readLobbies()) => {
  const snapshot = clone(lobbies);
  lobbyListListeners.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error("Failed to notify lobby list listener", error);
    }
  });
};

const notifyLobbyListeners = (lobby) => {
  if (!lobby) return;
  const listeners = lobbyListeners.get(lobby.code);
  if (!listeners || listeners.size === 0) return;
  const snapshot = clone(lobby);
  listeners.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error("Failed to notify lobby listener", error);
    }
  });
};

const broadcastUpdate = (lobby) => {
  if (!broadcastChannel || !lobby) return;
  broadcastChannel.postMessage({ type: "lobby-updated", payload: lobby.code });
};

if (broadcastChannel) {
  broadcastChannel.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    if (type === "lobby-updated") {
      notifyLobbyListListeners();
      if (typeof payload === "string") {
        const lobby = getLobby(payload);
        if (lobby) notifyLobbyListeners(lobby);
      }
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      notifyLobbyListListeners();
      const lobbies = readLobbies();
      lobbies.forEach((lobby) => notifyLobbyListeners(lobby));
    }
  });
}

const buildLobby = (code, defaults = {}) => {
  const now = new Date().toISOString();
  return {
    code,
    hostId: defaults.hostId || null,
    hostName: defaults.hostName || (defaults.hostId ? defaults.hostName : "Host"),
    channel: defaults.channel || defaults.channelName || defaultLobbySettings.channel,
    status: defaults.status || "waiting",
    settings: { ...defaultLobbySettings, ...defaults.settings },
    players: [],
    maxPlayers: defaults.maxPlayers || defaultLobbySettings.maxPlayers,
    playerCount: 0,
    createdAt: now,
    updatedAt: now
  };
};

const ensureLobby = (code, defaults = {}) => {
  const existing = getLobby(code);
  if (existing) return existing;
  const lobby = buildLobby(code, defaults);
  const lobbies = readLobbies();
  lobbies.push(lobby);
  writeLobbies(lobbies);
  notifyLobbyListeners(lobby);
  broadcastUpdate(lobby);
  return clone(lobby);
};

const getLobby = (code) => {
  if (!code) return null;
  const lobbies = readLobbies();
  const lobby = lobbies.find((entry) => entry.code === code);
  return lobby ? clone(lobby) : null;
};

const updateLobby = (code, mutator, defaults = {}) => {
  let lobby = getLobby(code);
  if (!lobby) {
    lobby = ensureLobby(code, defaults);
  }
  const updated = mutator(clone(lobby));
  if (!updated) return lobby;
  const next = {
    ...updated,
    players: Array.isArray(updated.players) ? updated.players : [],
    playerCount: Array.isArray(updated.players) ? updated.players.length : 0,
    updatedAt: new Date().toISOString()
  };
  const lobbies = readLobbies();
  const index = lobbies.findIndex((entry) => entry.code === code);
  if (index >= 0) {
    lobbies[index] = next;
  } else {
    lobbies.push(next);
  }
  writeLobbies(lobbies);
  notifyLobbyListeners(next);
  broadcastUpdate(next);
  return clone(next);
};

const joinLobby = (code, player, defaults = {}) => {
  const base = ensureLobby(code, defaults);
  return updateLobby(
    code,
    (lobby) => {
      const now = new Date().toISOString();
      const players = lobby.players || [];
      const index = players.findIndex((entry) => entry.id === player.id);
      const playerData = {
        id: player.id || randomId(),
        name: player.name || `Player ${code}`,
        score: typeof player.score === "number" ? player.score : 0,
        ready: Boolean(player.ready),
        isActive: player.isActive !== false,
        joinedAt: player.joinedAt || now,
        updatedAt: now
      };
      const nextPlayers = [...players];
      if (index >= 0) {
        nextPlayers[index] = { ...players[index], ...playerData };
      } else {
        nextPlayers.push(playerData);
      }
      return {
        ...lobby,
        hostId: lobby.hostId || playerData.id,
        hostName: lobby.hostId ? lobby.hostName : playerData.name,
        players: nextPlayers
      };
    },
    base
  );
};

const togglePlayerReady = (code, playerId, forceValue) => {
  if (!playerId) return null;
  return updateLobby(code, (lobby) => {
    const players = lobby.players || [];
    const index = players.findIndex((entry) => entry.id === playerId);
    if (index === -1) return null;
    const nextPlayers = [...players];
    const current = nextPlayers[index];
    const readyValue = typeof forceValue === "boolean" ? forceValue : !current.ready;
    if (readyValue === current.ready) return null;
    nextPlayers[index] = { ...current, ready: readyValue, updatedAt: new Date().toISOString() };
    return { ...lobby, players: nextPlayers };
  });
};

const incrementPlayerScore = (code, playerId, delta = 0) => {
  if (!delta) return null;
  return updateLobby(code, (lobby) => {
    const players = lobby.players || [];
    const index = players.findIndex((entry) => entry.id === playerId);
    if (index === -1) return null;
    const nextPlayers = [...players];
    const current = nextPlayers[index];
    nextPlayers[index] = {
      ...current,
      score: Math.max(0, (current.score || 0) + delta),
      updatedAt: new Date().toISOString()
    };
    return { ...lobby, players: nextPlayers };
  });
};

const updatePlayerName = (code, playerId, name) => {
  if (!name) return null;
  return updateLobby(code, (lobby) => {
    const players = lobby.players || [];
    const index = players.findIndex((entry) => entry.id === playerId);
    if (index === -1) return null;
    const current = players[index];
    if (current.name === name) return null;
    const nextPlayers = [...players];
    nextPlayers[index] = { ...current, name, updatedAt: new Date().toISOString() };
    const hostName = lobby.hostId === playerId ? name : lobby.hostName;
    return { ...lobby, hostName, players: nextPlayers };
  });
};

const setLobbyStatus = (code, status) => {
  if (!status) return null;
  return updateLobby(code, (lobby) => ({ ...lobby, status }));
};

const listLobbies = () => {
  const lobbies = readLobbies();
  const sorted = [...lobbies].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  return clone(sorted);
};

const subscribeToLobbyList = (callback) => {
  if (typeof callback !== "function") return () => {};
  lobbyListListeners.add(callback);
  callback(listLobbies());
  return () => {
    lobbyListListeners.delete(callback);
  };
};

const subscribeToLobby = (code, callback) => {
  if (!code || typeof callback !== "function") return () => {};
  const listeners = lobbyListeners.get(code) || new Set();
  listeners.add(callback);
  lobbyListeners.set(code, listeners);
  const lobby = getLobby(code);
  if (lobby) callback(lobby);
  return () => {
    const current = lobbyListeners.get(code);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) lobbyListeners.delete(code);
  };
};

const createLobby = (options = {}) => {
  const lobbies = readLobbies();
  let code = options.code || generateLobbyCode();
  while (lobbies.some((entry) => entry.code === code)) {
    code = generateLobbyCode();
  }
  const lobby = buildLobby(code, options);
  lobbies.push(lobby);
  writeLobbies(lobbies);
  notifyLobbyListeners(lobby);
  broadcastUpdate(lobby);
  return clone(lobby);
};

const ensurePlayerProfile = () => {
  if (!storageAvailable) {
    if (!window.__wordhexProfile) {
      window.__wordhexProfile = { id: randomId(), name: `Player ${generateLobbyCode()}` };
    }
    return window.__wordhexProfile;
  }
  const stored = safeParse(window.localStorage.getItem(PROFILE_KEY), null);
  if (stored && stored.id && stored.name) {
    return stored;
  }
  const profile = { id: randomId(), name: `Player ${generateLobbyCode()}`, createdAt: new Date().toISOString() };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
};

const updatePlayerProfile = (updates) => {
  if (!updates || typeof updates !== "object") return ensurePlayerProfile();
  const current = ensurePlayerProfile();
  const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
  if (storageAvailable) {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } else {
    window.__wordhexProfile = next;
  }
  return next;
};

const getPlayerProfile = () => ensurePlayerProfile();

export const lobbyService = {
  defaults: defaultLobbySettings,
  generateLobbyCode,
  createLobby,
  ensureLobby,
  getLobby,
  listLobbies,
  joinLobby,
  togglePlayerReady,
  incrementPlayerScore,
  updatePlayerName,
  setLobbyStatus,
  subscribeToLobbyList,
  subscribeToLobby
};

export { ensurePlayerProfile, updatePlayerProfile, getPlayerProfile, defaultLobbySettings as LOBBY_DEFAULTS };
