#!/bin/bash
# Portable node launcher for ContextFlow MCP Server
# Searches for node in common locations, then falls back to PATH
find_node() {
  # 1. Common macOS/Linux locations (ordered by preference)
  local candidates=(
    /opt/homebrew/bin/node
    /usr/local/bin/node
    /usr/bin/node
    "$HOME/.nvm/versions/$(ls -t "$HOME/.nvm/versions" 2>/dev/null | head -1)/bin/node"
    "$HOME/.volta/bin/node"
    "$HOME/.local/bin/node"
    "$NVM_DIR/versions/$(ls -t "$NVM_DIR/versions" 2>/dev/null | head -1)/bin/node"
  )
  for p in "${candidates[@]}"; do
    if [ -x "$p" ]; then
      echo "$p"
      return 0
    fi
  done
  # 2. Try PATH (may work in some environments)
  if command -v node &>/dev/null; then
    command -v node
    return 0
  fi
  return 1
}

NODE_BIN=$(find_node)
if [ -z "$NODE_BIN" ]; then
  echo "ContextFlow ERROR: node not found" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$NODE_BIN" "$SCRIPT_DIR/index.js" "$@"
