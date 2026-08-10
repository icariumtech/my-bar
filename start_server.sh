#!/bin/bash
# My Bar - Start Server Script

echo "================================"
echo "MY BAR"
echo "================================"
echo ""

PORT="${PORT:-3000}"
export PORT

if [ ! -d "apps/barback/dist" ] || [ -z "$(ls -A apps/barback/dist 2>/dev/null)" ]; then
    echo "Barback app not built yet (first run, or dist was cleaned) — building..."
    pnpm --filter barback build
    echo "✓ Barback app built"
    echo ""
fi

if [ ! -d "apps/server/dist" ]; then
    echo "Server not built yet — building..."
    pnpm --filter server build
    echo "✓ Server built"
    echo ""
fi

echo "Starting server..."
echo "Detecting network configuration..."
echo ""

LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "Server will be accessible at:"
echo "  Local:   http://127.0.0.1:$PORT/barback/"
echo "  Network: http://$LOCAL_IP:$PORT/barback/   <- use this from a phone or iPad on the same LAN"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

pnpm --filter server start
