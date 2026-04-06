---
title: Cloudflare Tunnel
summary: Expose your local Paperclip instance publicly via Cloudflare Tunnel
---

# Cloudflare Tunnel Setup

Expose your local Paperclip instance to the public internet using Cloudflare Tunnel. This lets you access Paperclip from anywhere while running it on your local machine with all your locally installed CLI tools (Claude Code, Codex, Gemini, OpenCode).

## Prerequisites

- Paperclip running locally (`pnpm dev`)
- [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) CLI installed

### Install Cloudflared

**Windows:**

```bash
winget install cloudflare.cloudflared
```

**macOS:**

```bash
brew install cloudflared
```

**Linux:**

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

## Quick Start (No Account Required)

This gives you a temporary random public URL — no Cloudflare account needed.

**Terminal 1 — Start Paperclip:**

```bash
pnpm dev
```

**Terminal 2 — Start the tunnel:**

```bash
cloudflared tunnel --url http://localhost:3100
```

Cloudflared will output a URL like `https://xxxx-yyyy.trycloudflare.com`. Open it from any device.

> **Note:** The URL changes every time you restart the tunnel.

## Custom Domain (Free Cloudflare Account)

To use your own domain (e.g. `paperclip.yourdomain.com`), you need a free Cloudflare account with your domain added to Cloudflare DNS.

### One-Time Setup

```bash
# Authenticate with Cloudflare
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create paperclip

# Route your domain to the tunnel
cloudflared tunnel route dns paperclip paperclip.yourdomain.com
```

### Run the Tunnel

```bash
cloudflared tunnel run --url http://localhost:3100 paperclip
```

Your Paperclip instance is now accessible at `https://paperclip.yourdomain.com`.

## Environment Configuration

When exposing Paperclip publicly, configure the following in your `.env` file at the project root:

```env
# Required — the public URL Paperclip is reachable at
PAPERCLIP_PUBLIC_URL=https://paperclip.yourdomain.com

# Required for authenticated mode — signs auth cookies
# Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=your-random-secret-string
```

These ensure:

- **`PAPERCLIP_PUBLIC_URL`** — Paperclip generates correct URLs for redirects, OAuth callbacks, and asset links.
- **`BETTER_AUTH_SECRET`** — Auth cookies are signed properly. Without this, login won't work over the public URL.

## Running Both Together

Open two terminals:

```bash
# Terminal 1 — Paperclip
pnpm dev

# Terminal 2 — Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3100
```

Or with a custom domain:

```bash
# Terminal 2 — Cloudflare Tunnel (named)
cloudflared tunnel run --url http://localhost:3100 paperclip
```

## Security

- Paperclip runs in **authenticated mode** by default (`PAPERCLIP_DEPLOYMENT_MODE=authenticated`), so all users must log in.
- Cloudflare Tunnel encrypts traffic end-to-end (TLS from client to Cloudflare, then Cloudflare to your machine via the tunnel).
- No ports need to be opened on your router or firewall.
- For additional access control, use [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) to restrict who can reach the tunnel.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Auth redirects fail or loop | Ensure `PAPERCLIP_PUBLIC_URL` matches the tunnel URL exactly |
| "Invalid cookie" errors | Set `BETTER_AUTH_SECRET` in `.env` and restart `pnpm dev` |
| Tunnel drops frequently | Use a named tunnel instead of the quick `--url` mode |
| Port 3100 already in use | Change Paperclip's port: `PORT=3200 pnpm dev` and update the tunnel URL accordingly |
