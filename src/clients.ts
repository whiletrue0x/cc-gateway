import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { randomBytes } from 'crypto'
import { parseDocument, YAMLSeq, YAMLMap } from 'yaml'

export interface ClientEntry {
  name: string
  token: string
}

const NAME_RE = /^[a-zA-Z0-9_.-]{1,64}$/

function configPath(): string {
  return resolve(process.argv[2] || 'config.yaml')
}

function loadDoc(path: string) {
  const raw = readFileSync(path, 'utf-8')
  return parseDocument(raw)
}

function getTokensSeq(doc: ReturnType<typeof parseDocument>): YAMLSeq {
  const auth = doc.getIn(['auth'], true) as YAMLMap | undefined
  if (!auth) throw new Error('config: auth section missing')
  let tokens = auth.get('tokens', true) as YAMLSeq | undefined
  if (!tokens) {
    tokens = new YAMLSeq()
    auth.set('tokens', tokens)
  }
  return tokens
}

export function listClients(): ClientEntry[] {
  const doc = loadDoc(configPath())
  const tokens = getTokensSeq(doc)
  const out: ClientEntry[] = []
  for (const item of tokens.items) {
    if (item instanceof YAMLMap) {
      const name = item.get('name')
      const token = item.get('token')
      if (typeof name === 'string' && typeof token === 'string') {
        out.push({ name, token })
      }
    }
  }
  return out
}

export function addClient(name: string): ClientEntry {
  if (!NAME_RE.test(name)) {
    throw new Error('client name must be 1-64 chars, [a-zA-Z0-9_.-]')
  }
  const path = configPath()
  const doc = loadDoc(path)
  const tokens = getTokensSeq(doc)

  for (const item of tokens.items) {
    if (item instanceof YAMLMap && item.get('name') === name) {
      throw new Error(`client "${name}" already exists`)
    }
  }

  const token = randomBytes(32).toString('hex')
  const entry = new YAMLMap()
  entry.set('name', name)
  entry.set('token', token)
  tokens.add(entry)

  writeFileSync(path, doc.toString(), 'utf-8')
  return { name, token }
}

export function removeClient(name: string): boolean {
  const path = configPath()
  const doc = loadDoc(path)
  const tokens = getTokensSeq(doc)

  let removedAt = -1
  for (let i = 0; i < tokens.items.length; i++) {
    const item = tokens.items[i]
    if (item instanceof YAMLMap && item.get('name') === name) {
      removedAt = i
      break
    }
  }
  if (removedAt === -1) return false

  tokens.delete(removedAt)
  if (tokens.items.length === 0) {
    throw new Error('cannot remove the last client — at least one token must remain')
  }
  writeFileSync(path, doc.toString(), 'utf-8')
  return true
}

export interface LauncherOptions {
  name: string
  token: string
  gatewayAddr: string  // e.g. "ccg.example.com" or "host:port"
  scheme: 'http' | 'https'
}

export function buildLauncherScript(opts: LauncherOptions): string {
  const tlsBypass = opts.scheme === 'https' ? '\n# Accept self-signed TLS cert from gateway\nexport NODE_TLS_REJECT_UNAUTHORIZED=0\n' : ''
  return `#!/bin/bash
# CC Gateway Client Launcher — ${opts.name}
#
# Usage:
#   ./cc-${opts.name}                    Start Claude Code through gateway
#   ./cc-${opts.name} --print "hello"    Single-shot mode
#   ./cc-${opts.name} install            Install as 'ccg' command system-wide
#   ./cc-${opts.name} uninstall          Remove 'ccg' and restore native claude
#   ./cc-${opts.name} native             Run native claude (bypass gateway)

GATEWAY_URL="${opts.scheme}://${opts.gatewayAddr}"
CLIENT_TOKEN="${opts.token}"
${tlsBypass}
INSTALL_PATH="/usr/local/bin/ccg"
SELF_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
case "$SHELL" in
  */zsh)  RC_FILE="\${ZDOTDIR:-$HOME}/.zshrc" ;;
  */bash) RC_FILE="$HOME/.bashrc" ;;
  */fish) RC_FILE="\${XDG_CONFIG_HOME:-$HOME/.config}/fish/config.fish" ;;
  *)      RC_FILE="$HOME/.profile" ;;
esac
ALIAS_TAG="# cc-gateway alias"

case "$1" in
  install)
    cp "$0" "$INSTALL_PATH" 2>/dev/null || sudo cp "$0" "$INSTALL_PATH"
    chmod +x "$INSTALL_PATH"
    echo "Installed as 'ccg'."
    exit 0
    ;;
  uninstall)
    rm "$INSTALL_PATH" 2>/dev/null || sudo rm "$INSTALL_PATH"
    if grep -q "$ALIAS_TAG" "$RC_FILE" 2>/dev/null; then
      sed -i.bak "/$ALIAS_TAG/d" "$RC_FILE"
      rm -f "\${RC_FILE}.bak"
    fi
    echo "Removed."
    exit 0
    ;;
  hijack)
    if grep -q "$ALIAS_TAG" "$RC_FILE" 2>/dev/null; then
      echo "Already active. Run 'ccg release' to undo."
    else
      if [[ "$SHELL" == */fish ]]; then
        echo "alias claude 'ccg' $ALIAS_TAG" >> "$RC_FILE"
      else
        echo "alias claude='ccg' $ALIAS_TAG" >> "$RC_FILE"
      fi
      echo "Done. Reopen terminal or: source $RC_FILE"
    fi
    exit 0
    ;;
  release)
    if grep -q "$ALIAS_TAG" "$RC_FILE" 2>/dev/null; then
      sed -i.bak "/$ALIAS_TAG/d" "$RC_FILE"
      rm -f "\${RC_FILE}.bak"
      unalias claude 2>/dev/null
      echo "Done."
    else
      echo "Nothing to undo."
    fi
    exit 0
    ;;
  native)
    shift
    exec command claude "$@"
    ;;
  status)
    echo "Gateway:  $GATEWAY_URL"
    if grep -q "$ALIAS_TAG" "$RC_FILE" 2>/dev/null; then
      echo "Hijack:   ON"
    else
      echo "Hijack:   OFF"
    fi
    HEALTH=$(curl -sk --max-time 3 "\${GATEWAY_URL}/_health" 2>/dev/null)
    [[ -n "$HEALTH" ]] && echo "Health:   OK" || echo "Health:   UNREACHABLE"
    exit 0
    ;;
  help|--help|-h)
    echo "ccg — Claude Code Gateway Client"
    echo ""
    echo "  ccg                    Start Claude Code through gateway"
    echo "  ccg install            Install as 'ccg' system command"
    echo "  ccg uninstall          Remove 'ccg'"
    echo "  ccg hijack             Make 'claude' go through gateway"
    echo "  ccg release            Restore native 'claude'"
    echo "  ccg native [args]      Run native claude once"
    echo "  ccg status             Show gateway status"
    exit 0
    ;;
esac

if ! command -v claude &>/dev/null; then
  echo "Error: 'claude' not found. Install Claude Code first:"
  echo "  npm install -g @anthropic-ai/claude-code"
  exit 1
fi

export ANTHROPIC_API_KEY="$CLIENT_TOKEN"
export ANTHROPIC_BASE_URL="$GATEWAY_URL"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export CLAUDE_CODE_ATTRIBUTION_HEADER=false

HEALTH=$(curl -sk --max-time 3 "\${GATEWAY_URL}/_health" 2>/dev/null)
if [[ -z "$HEALTH" ]]; then
  echo "Warning: Gateway at \${GATEWAY_URL} is not reachable."
  echo ""
fi

exec claude "$@"
`
}
