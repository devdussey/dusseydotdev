export type LobbySettings = {
  mode: string
  rounds: number
  roundDuration: number
  winCondition: string
  dictionary: string
  channel: string
  maxPlayers: number
  roundDurationSeconds?: number
}

export type PlayerEntry = {
  id: string
  name: string
  score?: number
  ready?: boolean
  isActive?: boolean
  updatedAt?: string
}

export type Lobby = {
  code: string
  hostId: string | null
  hostName: string | null
  codeCreatedAt?: string
  players: PlayerEntry[]
  createdAt: string
  updatedAt: string
  status?: string
  channel?: string
  maxPlayers?: number
  settings?: Partial<LobbySettings>
}

type LobbyUpdater = (lobby: Lobby) => Lobby | null
type LobbyListener = (lobby: Lobby) => void

const STORAGE_KEY = 'wordhex:lobbies'
const PROFILE_KEY = 'wordhex:player-profile'
const CHANNEL_NAME = 'wordhex:lobby-sync'

const defaultLobbySettings: LobbySettings = {
  mode: 'Unranked',
  rounds: 5,
  roundDuration: 0,
  winCondition: 'Highest score after 5 rounds',
  dictionary: 'Tournament (NA)',
  channel: '#spellcast-practice',
  maxPlayers: 6
}

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch (error) {
    console.warn('localStorage is unavailable', error)
    return false
  }
}

const storageAvailable = hasStorage()
const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const readLobbies = (): Lobby[] => {
  if (!storageAvailable) return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = safeParse(raw, [] as Lobby[])
  return Array.isArray(parsed) ? parsed : []
}

const writeLobbies = (lobbies: Lobby[]) => {
  if (!storageAvailable) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lobbies))
  notifyLobbyListListeners(lobbies)
}

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `player-${Math.random().toString(16).slice(2)}`
}

const generateLobbyCode = () => String(Math.floor(1000 + Math.random() * 9000))

const lobbyListListeners = new Set<(lobbies: Lobby[]) => void>()
const lobbyListeners = new Map<string, Set<LobbyListener>>()

const notifyLobbyListListeners = (lobbies: Lobby[] = readLobbies()) => {
  const snapshot = clone(lobbies)
  lobbyListListeners.forEach((callback) => {
    try {
      callback(snapshot)
    } catch (error) {
      console.error('Failed to notify lobby list listener', error)
    }
  })
}

const notifyLobbyListeners = (lobby: Lobby | null) => {
  if (!lobby) return
  const listeners = lobbyListeners.get(lobby.code)
  if (!listeners || listeners.size === 0) return
  const snapshot = clone(lobby)
  listeners.forEach((callback) => {
    try {
      callback(snapshot)
    } catch (error) {
      console.error('Failed to notify lobby listener', error)
    }
  })
}

const getLobby = (code: string) => {
  if (!code) return null
  const lobbies = readLobbies()
  const lobby = lobbies.find((entry) => entry.code === code)
  return lobby ? clone(lobby) : null
}

const broadcastUpdate = (lobby: Lobby | null) => {
  if (!broadcastChannel || !lobby) return
  broadcastChannel.postMessage({ type: 'lobby-updated', payload: lobby.code })
}

if (broadcastChannel) {
  broadcastChannel.addEventListener('message', (event) => {
    const { type, payload } = event.data || {}
    if (type === 'lobby-updated') {
      notifyLobbyListListeners()
      if (typeof payload === 'string') {
        const lobby = getLobby(payload)
        if (lobby) notifyLobbyListeners(lobby)
      }
    }
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      notifyLobbyListListeners()
      const lobbies = readLobbies()
      lobbies.forEach((lobby) => notifyLobbyListeners(lobby))
    }
  })
}

const buildLobby = (code: string, defaults: Partial<Lobby> = {}): Lobby => {
  const now = new Date().toISOString()
  return {
    code,
    hostId: defaults.hostId ?? null,
    hostName: defaults.hostName ?? (defaults.hostId ? defaults.hostName : 'Host'),
    createdAt: defaults.createdAt ?? now,
    updatedAt: defaults.updatedAt ?? now,
    players: defaults.players ?? [],
    status: defaults.status,
    channel: defaults.channel,
    maxPlayers: defaults.maxPlayers ?? defaultLobbySettings.maxPlayers,
    settings: defaults.settings ?? {}
  }
}

const updateLobby = (code: string, updater: LobbyUpdater): Lobby | null => {
  const lobbies = readLobbies()
  const index = lobbies.findIndex((entry) => entry.code === code)
  if (index === -1) return null
  const nextLobby = updater(lobbies[index])
  if (!nextLobby) return null
  const nextLobbies = [...lobbies]
  nextLobbies[index] = nextLobby
  writeLobbies(nextLobbies)
  notifyLobbyListeners(nextLobby)
  broadcastUpdate(nextLobby)
  return clone(nextLobby)
}

const ensureLobby = (code: string, options: Partial<Lobby> = {}) => {
  const existing = getLobby(code)
  if (existing) return existing
  const lobby = buildLobby(code, options)
  const lobbies = readLobbies()
  writeLobbies([...lobbies, lobby])
  notifyLobbyListeners(lobby)
  broadcastUpdate(lobby)
  return lobby
}

const joinLobby = (code: string, player: PlayerEntry) => {
  return updateLobby(code, (lobby) => {
    const players = lobby.players || []
    const index = players.findIndex((entry) => entry.id === player.id)
    const nextPlayers = [...players]
    if (index === -1) {
      nextPlayers.push({ ...player, updatedAt: new Date().toISOString() })
    } else {
      nextPlayers[index] = { ...nextPlayers[index], ...player, updatedAt: new Date().toISOString() }
    }
    return { ...lobby, players: nextPlayers, updatedAt: new Date().toISOString() }
  })
}

const togglePlayerReady = (code: string, playerId: string) => {
  return updateLobby(code, (lobby) => {
    const players = lobby.players || []
    const index = players.findIndex((entry) => entry.id === playerId)
    if (index === -1) return null
    const nextPlayers = [...players]
    nextPlayers[index] = {
      ...nextPlayers[index],
      ready: !nextPlayers[index].ready,
      updatedAt: new Date().toISOString()
    }
    return { ...lobby, players: nextPlayers, updatedAt: new Date().toISOString() }
  })
}

const incrementPlayerScore = (code: string, playerId: string, delta: number) => {
  if (delta === 0) return null
  return updateLobby(code, (lobby) => {
    const players = lobby.players || []
    const index = players.findIndex((entry) => entry.id === playerId)
    if (index === -1) return null
    const nextPlayers = [...players]
    const current = nextPlayers[index]
    nextPlayers[index] = {
      ...current,
      score: Math.max(0, (current.score ?? 0) + delta),
      updatedAt: new Date().toISOString()
    }
    return { ...lobby, players: nextPlayers, updatedAt: new Date().toISOString() }
  })
}

const updatePlayerName = (code: string, playerId: string, name: string) => {
  if (!name) return null
  return updateLobby(code, (lobby) => {
    const players = lobby.players || []
    const index = players.findIndex((entry) => entry.id === playerId)
    if (index === -1) return null
    const current = players[index]
    if (current.name === name) return null
    const nextPlayers = [...players]
    nextPlayers[index] = { ...current, name, updatedAt: new Date().toISOString() }
    const hostName = lobby.hostId === playerId ? name : lobby.hostName
    return { ...lobby, hostName, players: nextPlayers, updatedAt: new Date().toISOString() }
  })
}

const setLobbyStatus = (code: string, status: string) => {
  if (!status) return null
  return updateLobby(code, (lobby) => ({ ...lobby, status, updatedAt: new Date().toISOString() }))
}

const listLobbies = () => {
  const lobbies = readLobbies()
  const sorted = [...lobbies].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return bTime - aTime
  })
  return clone(sorted)
}

const subscribeToLobbyList = (callback: (lobbies: Lobby[]) => void) => {
  if (typeof callback !== 'function') return () => {}
  lobbyListListeners.add(callback)
  callback(listLobbies())
  return () => {
    lobbyListListeners.delete(callback)
  }
}

const subscribeToLobby = (code: string, callback: LobbyListener) => {
  if (!code || typeof callback !== 'function') return () => {}
  const listeners = lobbyListeners.get(code) || new Set()
  listeners.add(callback)
  lobbyListeners.set(code, listeners)
  const lobby = getLobby(code)
  if (lobby) callback(lobby)
  return () => {
    const current = lobbyListeners.get(code)
    if (!current) return
    current.delete(callback)
    if (current.size === 0) lobbyListeners.delete(code)
  }
}

const createLobby = (options: Partial<Lobby> = {}) => {
  const lobbies = readLobbies()
  let code = options.code || generateLobbyCode()
  while (lobbies.some((entry) => entry.code === code)) {
    code = generateLobbyCode()
  }
  const lobby = buildLobby(code, options)
  const next = [...lobbies, lobby]
  writeLobbies(next)
  notifyLobbyListeners(lobby)
  broadcastUpdate(lobby)
  return clone(lobby)
}

const ensurePlayerProfile = () => {
  if (!storageAvailable) {
    if (!window.__wordhexProfile) {
      window.__wordhexProfile = { id: randomId(), name: `Player ${generateLobbyCode()}` }
    }
    return window.__wordhexProfile
  }
  const stored = safeParse<Record<string, string>>(window.localStorage.getItem(PROFILE_KEY), null)
  if (stored && stored.id && stored.name) {
    return stored
  }
  const profile = { id: randomId(), name: `Player ${generateLobbyCode()}`, createdAt: new Date().toISOString() }
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  return profile
}

const updatePlayerProfile = (updates: Partial<Record<string, string>>) => {
  if (!updates || typeof updates !== 'object') return ensurePlayerProfile()
  const current = ensurePlayerProfile()
  const next = { ...current, ...updates, updatedAt: new Date().toISOString() }
  if (storageAvailable) {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
  } else {
    window.__wordhexProfile = next
  }
  return next
}

const getPlayerProfile = () => ensurePlayerProfile()

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
}

export { ensurePlayerProfile, updatePlayerProfile, getPlayerProfile, defaultLobbySettings as LOBBY_DEFAULTS }
