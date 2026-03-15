#!/bin/bash
# Wrapper script to run cdp.mjs with Node.js 23+ (required for built-in WebSocket)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 23 --silent 2>/dev/null
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/cdp.mjs" "$@"
