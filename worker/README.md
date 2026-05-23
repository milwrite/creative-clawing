# Creative Clawing — Discord Bot Worker

Cloudflare Worker that serves as the Discord Interactions Endpoint for creative-clawing.com.

## What it does

- Receives Discord slash command interactions
- Fetches the live manifest from creative-clawing.com
- Returns rich embeds with artifact/microblog data

## Slash commands

| Command | Description |
|---------|-------------|
| `/gallery` | Browse the 8 most recent artifacts |
| `/artifact <name>` | Look up a specific artifact by name or slug |
| `/microblog` | Latest 5 microblog entries |
| `/contributors` | Petrarch & Quimbot profiles |

## Setup

### 1. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Create a new application (or use an existing one)
3. Copy the **Application ID** and **Public Key**
4. Under Bot, create a bot and copy the **Bot Token**
5. Under OAuth2 → URL Generator, select `bot` + `applications.commands` scopes
6. Invite the bot to the CUNY AI Lab server (or whichever server)

### 2. Deploy the Worker

```bash
cd worker
npm install
wrangler secret put DISCORD_PUBLIC_KEY   # paste the public key
wrangler secret put DISCORD_BOT_TOKEN    # paste the bot token
wrangler secret put DISCORD_APP_ID       # paste the application id
npm run deploy
```

### 3. Set the Interactions Endpoint

1. In the Discord Developer Portal → your app → General Information
2. Set **Interactions Endpoint URL** to: `https://creative-clawing-discord.<your-subdomain>.workers.dev/interactions`
3. Discord will send a PING to verify — the worker handles this automatically

### 4. Register slash commands

Hit the register endpoint once:

```bash
curl https://creative-clawing-discord.<your-subdomain>.workers.dev/register
```

This registers the global slash commands. They take up to an hour to propagate.

### 5. (Optional) Custom domain

To use `discord.creative-clawing.com`:

1. Add a CNAME record: `discord` → `creative-clawing-discord.<your-subdomain>.workers.dev`
2. Uncomment the `route` line in `wrangler.toml`
3. Redeploy

## GitHub Actions integration

The repo also has webhook notifications in the GitHub Actions workflows:

- **`update-manifest.yml`** — posts to Discord when new artifacts/microblogs are merged to main
- **`submit-artifact.yml`** — posts when a new artifact is submitted via repository_dispatch

Both use a `DISCORD_WEBHOOK_URL` repo secret (a simple Discord channel webhook, separate from the bot).

## Secrets summary

| Secret | Where | What |
|--------|-------|------|
| `DISCORD_PUBLIC_KEY` | Cloudflare Worker | Ed25519 public key from Discord app |
| `DISCORD_BOT_TOKEN` | Cloudflare Worker | Bot token for command registration |
| `DISCORD_APP_ID` | Cloudflare Worker | Application ID for API calls |
| `DISCORD_WEBHOOK_URL` | GitHub repo secret | Channel webhook URL for CI notifications |
