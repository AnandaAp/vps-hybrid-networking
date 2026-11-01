# VPS Hybrid Networking — Agent Skill

An agent skill for setting up a **dual-layer VPS architecture** on a host where inbound ports `80`/`443` are blocked by the provider (NAT / CGNAT / upstream firewall) — the situation you get with many budget VPS plans.

Instead of fighting the NAT, the architecture splits traffic into two layers:

- **Public ingress** — Cloudflare Tunnel (`cloudflared`) carries public traffic over an outbound connection to a local **Caddy** reverse proxy, which serves real Let's Encrypt certificates obtained via the **DNS-01 challenge** (no inbound port needed).
- **Private access** — admin tools, internal dashboards, terminal agents, and local AI services are exposed **only** over a **Tailscale** (WireGuard) mesh. Nothing internal touches the public internet.

## What's inside

`SKILL.md` is a complete, self-contained runbook your agent can follow end to end:

- Architecture diagram and traffic flow (public vs. private)
- Manual web-console checklists (Cloudflare DNS + API token, Zero Trust tunnel, Tailscale admin)
- A staged server setup guide:
  1. Verifying NAT / blocked inbound ports
  2. Tailscale private network setup
  3. Installing Caddy with the Cloudflare DNS plugin
  4. A multi-tier Caddyfile (public vhosts + Tailscale-only private vhosts)
  5. Running `cloudflared` as a hardened systemd service
- Smoke tests for public ingress, markdown content negotiation, and private ingress
- A troubleshooting runbook covering the classic failure modes — Error 525 / TLS SNI handshake failure, DNS-01 challenge errors, `cloudflared` crash loops, and Tailscale connectivity loss

## Requirements

- A domain with nameservers delegated to Cloudflare
- A Cloudflare API token with `Zone → DNS → Edit`, scoped to that zone only
- A Cloudflare Zero Trust plan (free tier works) for the tunnel
- A Tailscale account
- A Debian / Ubuntu 22.04+ VPS with `sudo`

## Using the skill

Copy `SKILL.md` into your agent's skills directory (or point your agent at this repo) and ask it to set up or troubleshoot a NAT-ed VPS. All hostnames, IPs, and tokens in the file are placeholders (`example.com`, `100.64.0.1`, `<YOUR_CLOUDFLARE_API_TOKEN>`) — substitute your own values on the server.

## Security notes

- **Never commit real tokens.** This repo ships placeholders only. Keep real API tokens and tunnel tokens in protected files on the server (e.g. `/etc/cloudflared/token`, mode `600`), or reference them in the Caddyfile via `{env.CF_API_TOKEN}` instead of hardcoding the value.
- Scope the Cloudflare token to a single zone with DNS Edit only — it cannot touch your account or other domains.
- The `.gitignore` in this repo already excludes `.env` files, token files, certificates, and real `Caddyfile`s, so your working configs can't slip into a commit by accident.

## License

MIT — see [LICENSE](LICENSE).
