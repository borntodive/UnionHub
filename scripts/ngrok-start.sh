#!/usr/bin/env bash
# Starts ngrok on port 3000 and updates apps/mobile/.env.development with the tunnel URL.

ENV_FILE="/Users/andreacovelli/apps/CISL/UnionHub/apps/mobile/.env.development"
SENTINEL="/Users/andreacovelli/apps/CISL/UnionHub/.ngrok-ready"

# Clear stale sentinel from previous run
rm -f "$SENTINEL"

echo "Starting ngrok on port 3000..."
ngrok http 3000 &
NGROK_PID=$!

echo "Waiting for ngrok tunnel..."
TUNNEL_URL=""
for i in $(seq 1 30); do
    sleep 1
    TUNNEL_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for t in data.get('tunnels', []):
        if t.get('proto') == 'https':
            print(t['public_url'])
            break
except:
    pass
" 2>/dev/null)
    [ -n "$TUNNEL_URL" ] && break
    echo "  attempt $i/30..."
done

if [ -z "$TUNNEL_URL" ]; then
    echo "ERROR: no ngrok tunnel found after 30s"
    kill "$NGROK_PID" 2>/dev/null
    exit 1
fi

API_URL="${TUNNEL_URL}/api/v1"

# Update API_URL line in .env.development
sed -i '' "s|^API_URL=.*|API_URL=${API_URL}|" "$ENV_FILE"

# Signal frontend tab that .env is ready
touch "$SENTINEL"

echo ""
echo "Tunnel:  $TUNNEL_URL"
echo "API_URL: $API_URL"
echo ""
echo ".env.development updated:"
cat "$ENV_FILE"
echo ""
echo "ngrok running (PID: $NGROK_PID) — Ctrl+C to stop"
wait "$NGROK_PID"
