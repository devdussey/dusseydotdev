import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useDiscordSdk } from '../hooks/useDiscordSdk'
import { LOBBY_DEFAULTS, ensurePlayerProfile, lobbyService, Lobby, updatePlayerProfile } from '../services/lobby-service'
import './App.css'

type Tile = {
	letter: string
	value: number
	multiplier?: 'DL' | 'TL'
	word?: 'DW' | 'TW'
	gem?: boolean
	id: string
}

type ActivityFeedEntry = {
	player: string
	detail: string
	value: string
}

type StatusType = 'info' | 'success' | 'error' | 'hint'

const letterPool = [
	{ letters: 'AEIO', value: 1, weight: 32 },
	{ letters: 'DGLNRSTU', value: 2, weight: 28 },
	{ letters: 'BCFHMVPWY', value: 3, weight: 20 },
	{ letters: 'K', value: 4, weight: 8 },
	{ letters: 'JX', value: 5, weight: 6 },
	{ letters: 'QZ', value: 8, weight: 6 }
]

const multiplierTiles = ['DL', 'DL', 'TL', 'TL']
const wordTiles = ['DW', 'DW', 'TW']
const gemTileCount = 5

const randomLetter = () => {
	const totalWeight = letterPool.reduce((sum, set) => sum + set.weight, 0)
	const target = Math.random() * totalWeight
	let cumulative = 0
	for (const set of letterPool) {
		cumulative += set.weight
		if (target <= cumulative) {
			const letters = set.letters
			const letter = letters[Math.floor(Math.random() * letters.length)]
			return { letter, value: set.value }
		}
	}
	return { letter: 'E', value: 1 }
}

const generateBoard = (): Tile[] => {
	const tiles = Array.from({ length: 25 }, () => ({ ...randomLetter(), id: crypto.randomUUID() }))
	const availableIndexes = [...tiles.keys()]

	const assignSpecial = (tilesToAssign: string[], key: 'multiplier' | 'word') => {
		for (const type of tilesToAssign) {
			if (!availableIndexes.length) break
			const idx = availableIndexes.splice(Math.floor(Math.random() * availableIndexes.length), 1)[0]
			tiles[idx] = { ...tiles[idx], [key]: type }
		}
	}

	assignSpecial(multiplierTiles, 'multiplier')
	assignSpecial(wordTiles, 'word')

	const shuffled = [...availableIndexes].sort(() => Math.random() - 0.5).slice(0, gemTileCount)
	for (const idx of shuffled) {
		tiles[idx] = { ...tiles[idx], gem: true }
	}

	return tiles
}

export const Activity = () => {
	const { authenticated, discordSdk, status } = useDiscordSdk()
	const [channelName, setChannelName] = useState<string>()
	const [board, setBoard] = useState<Tile[]>(() => generateBoard())
	const [gemCount, setGemCount] = useState(3)
	const [wordInput, setWordInput] = useState('')
	const [wordHistory, setWordHistory] = useState<{ word: string; score: number }[]>([])
	const [activityFeed, setActivityFeed] = useState<ActivityFeedEntry[]>([])
	const [statusState, setStatusState] = useState({ message: 'Loading Discord SDK…', type: 'info' as StatusType })
	const [playerProfile, setPlayerProfile] = useState(() => ensurePlayerProfile())
	const [activeLobby, setActiveLobby] = useState<Lobby | null>(null)
	const [lobbyCode, setLobbyCode] = useState('')
	const wordInputRef = useRef<HTMLInputElement>(null)

	const cacheLobbyCode = (code: string) => {
		try {
			sessionStorage.setItem('wordhex:lastLobbyCode', code)
		} catch (error) {
			console.warn('Unable to cache lobby code', error)
		}
	}

	const getCachedLobbyCode = () => {
		try {
			return sessionStorage.getItem('wordhex:lastLobbyCode')
		} catch (error) {
			console.warn('Unable to read cached lobby code', error)
			return null
		}
	}

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		let code = params.get('code') || getCachedLobbyCode() || lobbyService.generateLobbyCode()
		if (!params.get('code')) {
			const nextUrl = new URL(window.location.href)
			nextUrl.searchParams.set('code', code)
			window.history.replaceState({}, '', nextUrl)
		}
		cacheLobbyCode(code)
		setLobbyCode(code)
	}, [])

	useEffect(() => {
		if (!lobbyCode) return
		lobbyService.ensureLobby(lobbyCode, {
			hostId: playerProfile.id,
			hostName: playerProfile.name
		})
		lobbyService.joinLobby(lobbyCode, {
			id: playerProfile.id,
			name: playerProfile.name,
			score: 0,
			ready: false,
			isActive: true
		})
		const unsubscribe = lobbyService.subscribeToLobby(lobbyCode, (lobby) => {
			setActiveLobby(lobby)
			cacheLobbyCode(lobby.code)
		})
		return () => {
			unsubscribe()
		}
	}, [lobbyCode, playerProfile])

	useEffect(() => {
		if (!authenticated || !discordSdk.channelId || !discordSdk.guildId) {
			return
		}
		discordSdk.commands.getChannel({ channel_id: discordSdk.channelId }).then((channel) => {
			if (channel.name) {
				setChannelName(channel.name)
			}
		})
	}, [authenticated, discordSdk])

	const flashStatus = (message: string, type: StatusType = 'info') => {
		setStatusState({ message, type })
	}

	const addFeedEntry = (entry: ActivityFeedEntry) => {
		setActivityFeed((previous) => {
			const next = [entry, ...previous]
			return next.slice(0, 12)
		})
	}

	const updateGemCount = (value: number) => {
		const sanitized = Math.max(0, Math.min(10, value))
		setGemCount(sanitized)
	}

	const scoreWord = (word: string) => {
		const letters = word.toUpperCase().split('')
		const boardCopy = board.map((tile) => ({ ...tile, used: false }))
		let baseScore = 0
		let wordMultiplier = 1
		let gemsEarned = 0

		for (const letter of letters) {
			const tileIndex = boardCopy.findIndex((tile) => tile.letter === letter && !tile.used)
			if (tileIndex === -1) return null
			const tile = boardCopy[tileIndex]
			tile.used = true
			let letterScore = tile.value
			if (tile.multiplier === 'DL') letterScore *= 2
			if (tile.multiplier === 'TL') letterScore *= 3
			baseScore += letterScore
			if (tile.word === 'DW') wordMultiplier *= 2
			if (tile.word === 'TW') wordMultiplier *= 3
			if (tile.gem) gemsEarned += 1
		}

		if (letters.length >= 6) baseScore += 10
		gemsEarned = Math.min(gemsEarned, Math.max(0, 10 - gemCount))

		return {
			score: baseScore * wordMultiplier,
			gems: gemsEarned
		}
	}

	const addWordToHistory = (word: string, score: number) => {
		setWordHistory((prev) => [{ word, score }, ...prev].slice(0, 12))
	}

	const handleWordSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const nextWord = wordInput.trim()
		if (!nextWord) return
		const result = scoreWord(nextWord)
		if (!result) {
			flashStatus('Letters must exist on the board', 'error')
			return
		}
		addWordToHistory(nextWord, result.score)
		addFeedEntry({
			player: playerProfile.name,
			detail: `scored <strong>${nextWord.toUpperCase()}</strong>`,
			value: `+${result.score} pts`
		})
		if (activeLobby) {
			lobbyService.incrementPlayerScore(activeLobby.code, playerProfile.id, result.score)
		}
		if (result.gems > 0) {
			updateGemCount(gemCount + result.gems)
		}
		flashStatus(`Word scored ${result.score} points`, 'success')
		setWordInput('')
		wordInputRef.current?.focus()
	}

	const addLetterToInput = (letter: string) => {
		setWordInput((previous) => previous + letter)
		wordInputRef.current?.focus()
	}

	const handleGemAction = (action: 'shuffle' | 'swap' | 'hint') => {
		if (action === 'shuffle' && gemCount < 1) return
		if (action === 'swap' && gemCount < 3) return
		if (action === 'hint' && gemCount < 4) return
		if (action === 'shuffle') {
			updateGemCount(gemCount - 1)
			setBoard(generateBoard())
			flashStatus('Board shuffled', 'info')
		} else if (action === 'swap') {
			updateGemCount(gemCount - 3)
			const idxA = Math.floor(Math.random() * board.length)
			let idxB = Math.floor(Math.random() * board.length)
			while (idxB === idxA) {
				idxB = Math.floor(Math.random() * board.length)
			}
			const nextBoard = [...board]
			[nextBoard[idxA], nextBoard[idxB]] = [nextBoard[idxB], nextBoard[idxA]]
			setBoard(nextBoard)
			flashStatus('Swapped two tiles', 'info')
		} else if (action === 'hint') {
			updateGemCount(gemCount - 4)
			const candidate = [...board].sort((a, b) => b.value - a.value)[0]
			if (candidate) {
				flashStatus(`Look for words with <strong>${candidate.letter}</strong> for max value!`, 'hint')
			}
		}
	}

	const handleReadyToggle = () => {
		if (!activeLobby) return
		lobbyService.togglePlayerReady(activeLobby.code, playerProfile.id)
	}

	const handleStartMatch = () => {
		if (!activeLobby) return
		const players = activeLobby.players || []
		if (activeLobby.hostId !== playerProfile.id) {
			flashStatus('Only the host can start the match.', 'error')
			return
		}
		if (players.length === 0 || players.some((player) => !player.ready)) {
			flashStatus('All players need to be ready before starting.', 'error')
			return
		}
		lobbyService.setLobbyStatus(activeLobby.code, 'active')
		flashStatus('Match starting in Discord lobby', 'success')
	}

	const handleHostRename = () => {
		if (!activeLobby || activeLobby.hostId !== playerProfile.id) return
		const currentName = activeLobby.hostName || 'Host'
		const nextName = window.prompt('Set your host display name', currentName) ?? ''
		const normalized = nextName.trim()
		if (!normalized || normalized === currentName) return
		const nextProfile = updatePlayerProfile({ name: normalized })
		setPlayerProfile(nextProfile)
		lobbyService.updatePlayerName(activeLobby.code, nextProfile.id, normalized)
	}

	const players = activeLobby?.players ? [...activeLobby.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) : []
	const readyCount = players.filter((player) => player.ready).length
	const isHost = activeLobby?.hostId === playerProfile.id
	const allReady = players.length > 0 && readyCount === players.length
	const lobbyStatusMessage = (() => {
		if (!players.length) return 'Waiting for players to join this lobby.'
		if (activeLobby?.status === 'active') return 'Match in progress.'
		if (readyCount === players.length) return 'All players ready—host can start the match.'
		return `${readyCount} of ${players.length} players ready.`
	})()

	const matchSettings = useMemo(() => {
		const settings = activeLobby?.settings ?? {}
		const rounds = settings.rounds ?? LOBBY_DEFAULTS.rounds
		const roundDuration =
			settings.roundDuration ?? settings.roundDurationSeconds ?? LOBBY_DEFAULTS.roundDuration
		const roundDurationLabel =
			roundDuration > 0 ? `${rounds} (${roundDuration}s each)` : `${rounds} (No timer)`
		return [
			{ label: 'Game Mode', value: settings.mode ?? LOBBY_DEFAULTS.mode },
			{ label: 'Rounds', value: roundDurationLabel },
			{ label: 'Win Condition', value: settings.winCondition ?? LOBBY_DEFAULTS.winCondition },
			{ label: 'Dictionary', value: settings.dictionary ?? LOBBY_DEFAULTS.dictionary }
		]
	}, [activeLobby])

	const buildMatchSettings = () =>
		matchSettings.map((setting) => (
			<div key={setting.label} className="setting-item">
				<span>{setting.label}</span>
				<strong>{setting.value}</strong>
			</div>
		))

	const copyInvite = async () => {
		if (!activeLobby) return
		try {
			const invite = new URL(window.location.href)
			invite.searchParams.set('code', activeLobby.code)
			await navigator.clipboard.writeText(`Join my Wordhex lobby (${activeLobby.code}): ${invite.toString()}`)
			flashStatus('Invite code copied', 'success')
		} catch (error) {
			console.error(error)
			flashStatus('Unable to copy invite', 'error')
		}
	}

	return (
		<div className="wordhex-app">
			<header>
				<h1>Wordhex</h1>
				<p>SpellCast-inspired multiplayer word hunt built for Discord Activities.</p>
			</header>

			<section id="lobby-hub" className="panel">
				<div className="lobby-grid">
					<div className="lobby-channel">
						<span className="label">Connected Voice Channel</span>
						<div className="channel-name" id="lobby-channel-name">
							{channelName ? `#${channelName}` : LOBBY_DEFAULTS.channel}
						</div>
						<p className="subtle">Match audio + Discord reactions sync here.</p>
					</div>
					<div className="lobby-pin">
						<span className="label">Lobby PIN</span>
						<div className="pin-code" id="lobby-code">
							{(activeLobby?.code ?? lobbyCode) || '----'}
						</div>
						<button onClick={copyInvite}>Copy Invite</button>
					</div>
					<div className="lobby-meta">
						<div>
							<span className="label">Host</span>
							<div className="host-name-row">
								<strong id="lobby-host">{activeLobby?.hostName || 'You'}</strong>
								{isHost && (
									<button id="edit-host-name" className="secondary host-rename" type="button" onClick={handleHostRename}>
										Rename
									</button>
								)}
							</div>
						</div>
						<div>
							<span className="label">Players Ready</span>
							<strong id="ready-count">
								{readyCount} / {players.length || 0}
							</strong>
						</div>
						<button id="start-match" onClick={handleStartMatch} disabled={!isHost || !allReady || activeLobby?.status === 'active'}>
							Start Match
						</button>
					</div>
				</div>

				<div className="match-settings" id="match-settings">
					{buildMatchSettings()}
				</div>
			</section>

			<main>
				<aside className="panel" id="scoreboard">
					<h2>Players</h2>
					<ul id="player-list">
						{players.length === 0 && <li className="empty">Share your lobby code to invite players.</li>}
						{players.map((player, index) => {
							const readyLabel = player.ready ? 'Ready' : 'Waiting'
							const hostTag = player.id === activeLobby?.hostId ? <span className="tag host">Host</span> : null
							return (
								<li key={player.id} data-ready={player.ready ?? false} className={player.id === playerProfile.id ? 'active' : ''}>
									<div>
										<span>
											{index + 1}. {player.name}
										</span>
										{hostTag}
										<span className="tag">{readyLabel}</span>
									</div>
									<span>{player.score ?? 0}</span>
								</li>
							)
						})}
					</ul>

					<div id="lobby-status" className="lobby-status">
						{lobbyStatusMessage}
					</div>

					<div className="player-actions">
						<button id="ready-up" className="secondary" onClick={handleReadyToggle} disabled={activeLobby?.status === 'active'}>
							{players.find((player) => player.id === playerProfile.id)?.ready ? 'Cancel Ready' : 'Ready Up'}
						</button>
					</div>

					<div id="status" data-type={statusState.type}>
						{statusState.message}
					</div>
				</aside>

				<section className="panel">
					<h2>Active Board</h2>
					<div id="board" aria-live="polite">
						{board.map((tile) => (
							<button
								key={tile.id}
								type="button"
								className="tile"
								data-multiplier={tile.multiplier}
								data-word={tile.word}
								data-gem={tile.gem ? 'true' : undefined}
								aria-label={`${tile.letter} tile, worth ${tile.value} points`}
								onClick={() => addLetterToInput(tile.letter)}
							>
								<div className="letter">{tile.letter}</div>
								<div className="value">{tile.value}pt</div>
							</button>
						))}
					</div>

					<form id="word-form" autoComplete="off" onSubmit={handleWordSubmit}>
						<label htmlFor="word-input">Submit a word</label>
						<input
							id="word-input"
							name="word"
							type="text"
							placeholder="Type your word"
							required
							minLength={2}
							value={wordInput}
							ref={wordInputRef}
							onChange={(event) => setWordInput(event.target.value)}
						/>
						<button type="submit">Submit Word</button>
					</form>

					<div id="word-history">
						{wordHistory.map((entry) => (
							<div key={`${entry.word}-${entry.score}`} className="word-entry">
								<strong>{entry.word.toUpperCase()}</strong>
								<span>+{entry.score} pts</span>
							</div>
						))}
					</div>
				</section>

				<aside className="panel" id="multiplayer">
					<h2>Gem Abilities</h2>
					<div id="gems">
						<span>Gem Reserve</span>
						<div id="gem-count">{gemCount}</div>
					</div>

					<div className="gem-actions">
						<button data-action="shuffle" onClick={() => handleGemAction('shuffle')} disabled={gemCount < 1}>
							Shuffle Board
							<span>Cost: 1</span>
						</button>
						<button data-action="swap" onClick={() => handleGemAction('swap')} disabled={gemCount < 3}>
							Swap Tiles
							<span>Cost: 3</span>
						</button>
						<button data-action="hint" onClick={() => handleGemAction('hint')} disabled={gemCount < 4}>
							Reveal Hint
							<span>Cost: 4</span>
						</button>
					</div>

					<section id="activity-feed">
						<header>
							<h3>Match Feed</h3>
							<span className="label">Live events for everyone in the lobby.</span>
						</header>
						<div id="feed-entries">
							{activityFeed.map((entry, index) => (
								<div key={`${entry.player}-${index}`} className="feed-entry">
									<div dangerouslySetInnerHTML={{ __html: `<strong>${entry.player}</strong> ${entry.detail}` }} />
									<span>{entry.value}</span>
								</div>
							))}
						</div>
					</section>
				</aside>
			</main>
		</div>
	)
}
