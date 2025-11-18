<p align="center">✨ <strong>WordHex Activity</strong> ✨</p>

---

# WordHex Activity

This repository now hosts the **WordHex Discord Activity** inside a Robo.js project. The interactive board, lobby synchronization, gem abilities, and match feed are rendered in `src/app/Activity.tsx` while the backend uses `/src/api/token.ts` to keep Discord credentials confidential.

## Quick Links

- [Getting Started (Discord Activities guide)](https://robojs.dev/discord-activities/getting-started)
- [Authentication walkthrough](https://robojs.dev/discord-activities/authentication)
- [Credential requirements](https://robojs.dev/discord-activities/credentials)
- [Proxy configuration](https://robojs.dev/discord-activities/proxy)
- [Multiplayer guide](https://robojs.dev/discord-activities/multiplayer)

## Running locally

```bash
npm install
npm run dev
```

`npm run dev` starts Robo.js in development mode, spins up the Discord proxy, and exposes a tunnel URL you can paste into your Activity’s URL mapping for testing.

## Authentication & Credentials

- The Activity wraps `Activity` inside `<DiscordContextProvider authenticate scope={['identify', 'guilds']}>` so Discord sessions are authorized before the board loads.
- `/src/api/token.ts` handles the OAuth token exchange, securely forwarding `client_secret` and the configured redirect URI.
- Keep real secrets out of source control by copying `.env.example` into `.env` and filling in your Discord Developer Portal values:

```bash
DISCORD_CLIENT_ID=your_application_id
VITE_DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://your-activity-url/api/token
PORT=3000
```

Robo.js loads these env vars automatically, and `config/credentials/discord.ts` mirrors them so the platform can surface missing credentials during `robo deploy`.

## Multiplayer synchronization

- Lobby state is stored via `src/services/lobby-service.ts` and synced across tabs using `BroadcastChannel`.
- The `@robojs/sync` plugin (`config/plugins/robojs/sync.ts`) is enabled so any multiplayer plugin hooks run consistently when you deploy.

## Building & Deploying

```bash
npm run build
```

- This runs `robo build` and packages both the client Activity and server APIs.
- When you deploy, Robo.js ships the build to the Discord Activity host and keeps the Discord Proxy (`DiscordProxy.Vite()`, see `config/vite.mjs`) live for `/api/token`.

## Self-hosting

- Ensure your server runs Node.js v20 or newer (per the Robo.js self-hosting guide).
- Install dependencies with `npm install`, build with `npm run build`, and run `npm run start` to keep the `robo` process alive.
- Point your own reverse proxy or process manager at the Robo server, and make sure Discord’s Activity URL mapping reaches the same `/api/token` proxy route.
- Refer to [https://robojs.dev/hosting/self-host](https://robojs.dev/hosting/self-host) for the complete workflow and troubleshooting tips.

## Directory overview

- `/src/app` – React UI with the board, scoreboard, lobby panels, and gem actions.
- `/src/api` – Server routes such as `token.ts`.
- `/src/hooks` – Discord SDK helpers (`useDiscordSdk`).
- `/src/services` – Lobby management helpers reused across the UI.
- `/config` – Robo configuration (`robo.ts`, plugin hooks, credentials, Vite settings).
