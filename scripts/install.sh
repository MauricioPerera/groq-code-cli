#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-MauricioPerera/groq-code-cli}"
BRANCH="${2:-main}"

info() { printf '\033[36m[INFO]\033[0m %s\n' "$1"; }
err()  { printf '\033[31m[ERROR]\033[0m %s\n' "$1"; }

if ! command -v node >/dev/null 2>&1; then err "Node.js not found"; exit 1; fi
if ! command -v npm  >/dev/null 2>&1; then err "npm not found"; exit 1; fi

info "Trying global install from GitHub (npm)"
if npm install -g "github:$REPO" >/dev/null 2>&1; then
  info "Installed via npm (GitHub)"
  nexus -V || true
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then err "Git not found for fallback"; exit 1; fi
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t nexus-cli-install)"
info "Cloning https://github.com/$REPO (branch $BRANCH) into $TMP_DIR"
 git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TMP_DIR" >/dev/null

cd "$TMP_DIR"
info "Installing deps (npm ci)"
npm ci >/dev/null
info "Building (npm run build)"
npm run build >/dev/null
info "Linking globally (npm link)"
npm link >/dev/null

info "Validating installation"
if ! nexus -V >/dev/null 2>&1; then
  err "'nexus' command not available after install"
  exit 1
fi
info "Done. Use 'nexus' to start."
