# Wordhex Discord Activity Package

This folder contains the files that Discord expects when uploading Wordhex as a first-party
Activity. The layout mirrors the guidance from the Embedded App SDK documentation and the
Entry Point Commands specification so that the game can be launched directly inside Discord
via slash commands.

## Directory structure

```
wordhex/discord-activity
├── activity_manifest.json        # Deployment metadata for Discord Activities
├── entry-point-commands.json     # Slash commands wired to each Activity entry point
└── public/
    ├── index.html                # Activity iframe entry file
    ├── scripts/activity.js       # Game logic + Discord SDK bootstrap
    └── styles/activity.css       # Standalone Activity styles
```

The `public/` folder is the payload that gets hosted on Netlify (or the CDN of your choice).
`activity_manifest.json` and `entry-point-commands.json` travel with the payload so that you can
upload everything in a single zip when creating a release in the Discord Developer Portal.

## Activity manifest

`activity_manifest.json` describes the Activity to Discord: entry html path, OAuth scopes, and
content-security requirements. You can copy this file into the "Upload Activity Build" modal or
use it as the base when programmatically creating a build through the Activities API.

- `activity.slug` is the shorthand name that appears inside Discord.
- `entry_point.path` points at `public/index.html`, which is the iframe root.
- `oauth2.scopes` enumerates the scopes requested during `discordSdk.commands.authorize`.

## Entry point commands

Discord Activities now require explicit entry point commands as described in the
[`application-commands#entry-point-commands`](https://discord.com/developers/docs/interactions/application-commands#entry-point-commands)
documentation. `entry-point-commands.json` defines two slash sub-commands—`practice` and
`lobby`—so that members can launch the appropriate flow without touching external buttons. These
objects can be imported directly through the "Bulk Overwrite" option inside the Developer Portal,
or deployed through your automation pipeline.

## Local preview

You can open `public/index.html` directly in a browser to validate layout changes. When running
inside Discord you must serve the files over HTTPS. For quick manual tests run a static server
from the repository root:

```
npx http-server wordhex/discord-activity/public --port 4173 --cors
```

Then tunnel the port (Cloudflare Tunnel, ngrok, etc.) and register the tunnel URL as your
Activity's temporary build URL, as outlined in the
[Discord Activities overview](https://discord.com/developers/docs/activities/overview).

## Packaging for upload

Once changes are ready, zip the manifest, command definition, and public assets:

```
npm run package:wordhex-activity
```

The script emits `wordhex/wordhex-activity.zip` which can be uploaded straight into the Discord
Developer Portal → Activities → Upload Build UI. Each upload should be accompanied by the same
command definitions so that Discord knows how to surface the Activity to users.
