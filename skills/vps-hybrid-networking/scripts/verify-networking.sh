#!/usr/bin/env bash
set -euo pipefail

TARGET_DOMAIN="${1:-${DOMAIN:-localhost}}"

echo "=== [1/4] Checking Host Network & Routing ==="
ip -br addr show || true
ip route | grep default || true

echo -e "\n=== [2/4] Checking Tailscale Status ==="
if command -v tailscale >/dev/null 2>&1; then
    tailscale status || true
    echo "Tailscale IPv4: $(tailscale ip -4 2>/dev/null || echo 'Not connected')"
else
    echo "Tailscale is NOT installed."
fi

echo -e "\n=== [3/4] Checking Caddy Web Server ==="
if systemctl is-active --quiet caddy; then
    echo "Caddy service is ACTIVE."
    /usr/bin/caddy list-modules | grep -E "dns\.providers\.cloudflare|tls\.get_certificate\.tailscale" || echo "Note: Custom caddy modules check complete"
else
    echo "Caddy service is INACTIVE or NOT running."
fi

echo -e "\n=== [4/4] Checking Cloudflare Tunnel (cloudflared) ==="
if systemctl is-active --quiet cloudflared; then
    echo "cloudflared service is ACTIVE."
    cloudflared --version || true
else
    echo "cloudflared service is INACTIVE or NOT running."
fi

echo -e "\n=== Connectivity Smoke Test ==="
echo "Testing local endpoint http://127.0.0.1:80..."
curl -s -o /dev/null -w "Local Port 80 Response: %{http_code}\n" http://127.0.0.1/ || echo "Local port 80 check failed"

if [ "$TARGET_DOMAIN" != "localhost" ]; then
    echo "Testing target domain https://${TARGET_DOMAIN}..."
    curl -s -o /dev/null -w "Target HTTPS Response: %{http_code}\n" "https://${TARGET_DOMAIN}" || echo "Target HTTPS check failed"
fi

echo -e "\n=== Verification Complete ==="
