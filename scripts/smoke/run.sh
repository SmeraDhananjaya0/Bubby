#!/bin/zsh
# Build the web export, serve it, launch headless Chrome and run the onboarding smoke test.
# Usage: npm run smoke:web [-- --no-build]   Screenshots land in .smoke/shots (git-ignored).
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/.smoke"; mkdir -p "$OUT/shots"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[[ "$1" == "--no-build" ]] || (cd "$ROOT" && npm run build:web)
node "$ROOT/scripts/smoke/server.mjs" "$ROOT/dist" 4173 > "$OUT/server.log" 2>&1 &
SERVER=$!
"$CHROME" --headless=new --remote-debugging-port=9222 '--remote-allow-origins=*' --user-data-dir="$OUT/chrome-profile" --no-first-run --no-default-browser-check --disable-gpu about:blank > "$OUT/chrome.log" 2>&1 &
CHROME_PID=$!
for i in {1..60}; do curl -s http://127.0.0.1:9222/json/version > /dev/null && break; sleep 0.5; done
node "$ROOT/scripts/smoke/driver.mjs" "$OUT/shots"; CODE=$?
kill $SERVER $CHROME_PID 2>/dev/null || true
exit $CODE
