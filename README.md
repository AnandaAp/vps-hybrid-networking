# VPS Hybrid Networking — Agent Skill

An agent skill for setting up a **dual-layer VPS architecture** on a host where inbound ports `80`/`443` are blocked by the provider (NAT / CGNAT / upstream firewall) — the situation you get with many budget VPS plans.

Instead of fighting the NAT, the architecture splits traffic into two layers:

- **Public ingress** — Cloudflare Tunnel (`cloudflared`) carries public traffic over an outbound connection to a local **Caddy** reverse proxy, which serves real Let's Encrypt certificates obtained via the **DNS-01 challenge** (no inbound port needed).
- **Private access** — admin tools, internal dashboards, terminal agents, and local AI services are exposed **only** over a **Tailscale** (WireGuard) mesh. Nothing internal touches the public internet.

This is not a theoretical design: it is the exact architecture running [anlian.web.id](https://anlian.web.id) in production, written up after the NAT diagnosis that led to it.

## Installation

The skill lives in [`skills/vps-hybrid-networking/`](skills/vps-hybrid-networking/) and this repo is packaged for the major agentic CLIs. Pick your tool:

### Any CLI — the universal installer (skills.sh)

```bash
npx skills add AnandaAp/vps-hybrid-networking
```

The [skills CLI](https://skills.sh) auto-detects 75+ agents (Claude Code, Codex, Cursor, OpenCode, Gemini CLI, Antigravity, Hermes Agent, Windsurf, Cline, …) and installs the skill into the right folder for each. Add `-g` for a global install, or `--agent <name>` to target one agent.

### Claude Code — plugin marketplace

```
/plugin marketplace add AnandaAp/vps-hybrid-networking
/plugin install vps-hybrid-networking@anlian-skills
```

### Antigravity (`agy`)

```bash
git clone https://github.com/AnandaAp/vps-hybrid-networking
agy plugin validate --strict ./vps-hybrid-networking
agy plugin install ./vps-hybrid-networking
```

### Codex — plugin marketplace

```bash
codex plugin marketplace add AnandaAp/vps-hybrid-networking
codex plugin add vps-hybrid-networking@anlian-skills
```

### Gemini CLI

As a skill:

```bash
gemini skills install https://github.com/AnandaAp/vps-hybrid-networking.git --path skills/vps-hybrid-networking --consent
```

Or as an extension (bundles the same skill):

```bash
gemini extensions install https://github.com/AnandaAp/vps-hybrid-networking
```

### Hermes Agent (Nous Research)

Hermes installs skills straight from GitHub — the identifier is the repo-relative path to the skill folder:

```bash
hermes skills install AnandaAp/vps-hybrid-networking/skills/vps-hybrid-networking
```

Hermes security-scans skills on install. You can also register this repo as a reusable source once with `hermes skills tap add AnandaAp/vps-hybrid-networking`.

> **Note on the Hermes security scan:** this skill is a root-level server-administration runbook, so Hermes' pattern scanner flags its subject matter (`sudo`, systemd units, files under `/etc`, network tunnels) and hub installs are currently blocked with a "dangerous" verdict. The flagged operations are the setup itself, run on your own server with your own tokens — but review the findings before trusting any skill, including this one. If you have reviewed it and want it anyway, install manually: copy `skills/vps-hybrid-networking/` into your Hermes skills folder (`%LOCALAPPDATA%\hermes\skills\` on Windows, `~/.hermes/skills\` elsewhere) and restart Hermes.

### npm / npx installer (this repo's own package)

```bash
npx vps-hybrid-networking@1.0.5
```

Auto-detects your installed agents and copies the skill into each one's skills folder. Targets: Claude Code, Antigravity, Codex / agents standard, Gemini CLI, OpenCode, Cursor, Hermes Agent, Cline, Roo Code, Goose, Amp, Windsurf, Kiro CLI, Qwen Code, GitHub Copilot, Trae, and Continue. Useful flags: `--all`, `--agent claude-code,antigravity`, `--list`, `--dry-run`. (If the npm package is not yet published, clone this repo and run `node bin/install.mjs --all` — it is the same code with the same result.)

Runs on **Windows, macOS, and Linux**. Platform notes: on macOS and Linux, the XDG-style targets (OpenCode, Goose, Amp) honor `$XDG_CONFIG_HOME` when it is set — matching how those tools resolve their own config directories (OpenCode uses `~/.config/opencode` on macOS too, not `~/Library`). Hermes uses `%LOCALAPPDATA%\hermes\skills\` on Windows and `~/.hermes/skills/` on macOS/Linux.

### Manual

Copy the `skills/vps-hybrid-networking/` folder into your agent's skills directory (e.g. `~/.claude/skills/`, `~/.agents/skills/`, `~/.gemini/config/skills/`, `~/.hermes/skills/` — on Windows, Hermes uses `%LOCALAPPDATA%\hermes\skills\`). Done — the skill is just files.

## Installer security

The npm installer is built to be boring and auditable:

- **Zero dependencies** — Node.js standard library only; there is no dependency tree to compromise.
- **No install hooks** — `package.json` defines no lifecycle scripts, so nothing runs implicitly on `npm install`/`npx`. The installer runs only when you invoke it.
- **No network, no execution** — the installer never downloads anything and never spawns a process. It only copies the skill files bundled inside the package into a fixed allow-list of well-known agent folders, and it verifies every destination stays inside its allow-listed folder before copying.
- **Pin the version** (`npx vps-hybrid-networking@1.0.5`) if you want reproducible installs, and read [`bin/install.mjs`](bin/install.mjs) — it is short on purpose.
- Prefer not to run third-party installers at all? Use `npx skills add` (which pulls straight from GitHub) or the manual copy above.

## What's inside

[`skills/vps-hybrid-networking/SKILL.md`](skills/vps-hybrid-networking/SKILL.md) is a complete, self-contained runbook your agent can follow end to end:

- Architecture diagram and traffic flow (public vs. private)
- Manual web-console checklists (Cloudflare DNS + API token, Zero Trust tunnel, Tailscale admin)
- A staged server setup guide:
  1. Verifying NAT / blocked inbound ports
  2. Tailscale private network setup
  3. Installing Caddy with the Cloudflare DNS plugin
  4. A multi-tier Caddyfile (public vhosts + Tailscale-only private vhosts)
  5. Running `cloudflared` as a hardened systemd service
- Smoke tests for public ingress, markdown content negotiation, and private ingress — plus a bundled `scripts/verify-networking.sh` that checks host networking, Tailscale, Caddy, and the tunnel in four steps
- A troubleshooting runbook covering the classic failure modes — Error 525 / TLS SNI handshake failure, DNS-01 challenge errors, `cloudflared` crash loops, and Tailscale connectivity loss

## Requirements

- A domain with nameservers delegated to Cloudflare
- A Cloudflare API token with `Zone → DNS → Edit`, scoped to that zone only
- A Cloudflare Zero Trust plan (free tier works) for the tunnel
- A Tailscale account
- A Debian / Ubuntu 22.04+ VPS with `sudo`

All hostnames, IPs, and tokens in the skill are placeholders (`example.com`, `100.64.0.1`, `<YOUR_CLOUDFLARE_API_TOKEN>`) — substitute your own values on the server.

## Repository layout

```
skills/vps-hybrid-networking/   the skill itself (SKILL.md + scripts/)
.claude-plugin/                 Claude Code plugin + marketplace manifests
.antigravity-plugin/            Antigravity plugin manifest
.agents/plugins/                Codex marketplace catalog
plugin.json                     Agent Plugins standard manifest (Codex/Cursor portable layout)
gemini-extension.json           Gemini CLI extension manifest
assets/logo.jpg                 plugin logo (Antigravity Marketplace)
package.json + bin/install.mjs  the zero-dependency npm/npx installer
```

## Security notes

- **Never commit real tokens.** This repo ships placeholders only. Keep real API tokens and tunnel tokens in protected files on the server (e.g. `/etc/cloudflared/token`, mode `600`), or reference them in the Caddyfile via `{env.CF_API_TOKEN}` instead of hardcoding the value.
- Scope the Cloudflare token to a single zone with DNS Edit only — it cannot touch your account or other domains.
- The `.gitignore` in this repo excludes `.env` files, token files, certificates, and real `Caddyfile`s, so your working configs can't slip into a commit by accident.

## License

MIT — see [LICENSE](LICENSE).
