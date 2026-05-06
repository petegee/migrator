#!/usr/bin/env bash
# learn.sh — RALPH loop driver: ETX primitive → Ethos UI via WASM emulator
#
# Each run is one session for one primitive. Claude drives Playwright to enter the
# primitive into the Ethos emulator, verifies via screenshot, updates the per-type
# rules file, and writes result.txt (SUCCESS or LEARN: <notes>).
#
# The accumulated.bin carries state between sessions — each session uploads it,
# adds one primitive, downloads the updated model.
#
# Usage:
#   ./learn.sh [--headed] <container.etx> <model-name> <type> [<index>]
#   ./learn.sh [--headed] <container.etx> <model-name> --list
#   ./learn.sh [--headed] <container.etx> <model-name> --status
#
# Options:
#   --headed   Open a visible browser window (default: headless)
#
# Container path is relative to the migrator root (parent directory).
# Types (recommended order):
#   model-info → flight-mode → logical-switch → var → mix → output → curve → special-function
#
# Note: flight-mode before logical-switch when FMs use physical switches only.
#   For FMs that use logical switches as conditions (e.g. BAMF2 FM1/FM2), enter those
#   FMs after logical-switch sessions and re-run them to add the condition.
#
# Examples:
#   ./learn.sh "models/20231128_BAMF2 Std/20231128.etx" "BAMF2 Std" --list
#   ./learn.sh --headed "models/20231128_BAMF2 Std/20231128.etx" "BAMF2 Std" var 0
#   ./learn.sh "models/20231128_BAMF2 Std/20231128.etx" "BAMF2 Std" model-info

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"   # primitive-migration/
ROOT="$(cd "$DIR/.." && pwd)"          # migrator/

SKILLS_DIR="$ROOT/skills/primitives"
BROWSER_DIR="$ROOT/browser"
SESSIONS_DIR="$DIR/sessions"
EXTRACTOR="$ROOT/lib/etx-extract-primitive.py"

# Extract --headed flag from anywhere in the args
HEADED=0
POSITIONAL=()
for arg in "$@"; do
  if [ "$arg" = "--headed" ]; then
    HEADED=1
  else
    POSITIONAL+=("$arg")
  fi
done
set -- "${POSITIONAL[@]+"${POSITIONAL[@]}"}"

CONTAINER=${1:-}
MODEL=${2:-}
MODE=${3:-}
INDEX=${4:-}

PLAYWRIGHT_FLAGS="--reporter=list --project=chromium"
HEADED_NOTE=""
if [ "$HEADED" -eq 1 ]; then
  PLAYWRIGHT_FLAGS="$PLAYWRIGHT_FLAGS --headed"
  HEADED_NOTE=" [HEADED — browser window will open]"
fi

if [ -z "$CONTAINER" ] || [ -z "$MODEL" ] || [ -z "$MODE" ]; then
  echo "Usage: $0 [--headed] <container.etx> <model-name> <type|--list|--status> [<index>]"
  echo ""
  echo "  --headed   Open a visible browser window instead of running headless"
  echo ""
  echo "Container path is relative to: $ROOT"
  echo "Types (recommended order):"
  echo "  model-info → flight-mode → logical-switch → var → mix → output → curve → special-function"
  echo ""
  echo "Examples:"
  echo "  $0 \"models/20231128_BAMF2 Std/20231128.etx\" 'BAMF2 Std' --list"
  echo "  $0 --headed \"models/20231128_BAMF2 Std/20231128.etx\" 'BAMF2 Std' var 0"
  exit 1
fi

ETX_FILE="$ROOT/$CONTAINER"
if [ ! -f "$ETX_FILE" ]; then
  echo "ERROR: Container file not found: $ETX_FILE"
  exit 1
fi

MODEL_SAFE="${MODEL// /_}"
MODEL_SESSIONS_DIR="$SESSIONS_DIR/$MODEL_SAFE"
ACCUMULATED_BIN="$MODEL_SESSIONS_DIR/accumulated.bin"

mkdir -p "$MODEL_SESSIONS_DIR"

# ── --list ───────────────────────────────────────────────────────────────────
if [ "$MODE" = "--list" ]; then
  echo "=== Primitives in model: $MODEL ==="
  echo ""
  python3 "$EXTRACTOR" "$ETX_FILE" "$MODEL" --list
  exit 0
fi

# ── --status ─────────────────────────────────────────────────────────────────
if [ "$MODE" = "--status" ]; then
  echo "=== Session status for: $MODEL ==="
  echo ""

  shopt -s nullglob
  found=0
  for primitive_dir in "$MODEL_SESSIONS_DIR"/*/; do
    found=1
    primitive_key=$(basename "$primitive_dir")
    last_session=$(ls -dv "$primitive_dir"session-* 2>/dev/null | tail -1 || true)
    if [ -z "$last_session" ]; then
      echo "  $primitive_key: no sessions"
      continue
    fi
    session_num=$(basename "$last_session" | sed 's/session-//')
    result_file="$last_session/result.txt"
    if [ -f "$result_file" ]; then
      result=$(head -1 "$result_file")
      echo "  $primitive_key: session $session_num → $result"
    else
      echo "  $primitive_key: session $session_num → (in progress / no result)"
    fi
  done
  shopt -u nullglob

  if [ "$found" -eq 0 ]; then
    echo "  No sessions yet."
  fi

  echo ""
  if [ -f "$ACCUMULATED_BIN" ]; then
    size=$(wc -c < "$ACCUMULATED_BIN")
    echo "  accumulated.bin: ${size} bytes"
  else
    echo "  accumulated.bin: not yet created"
  fi
  exit 0
fi

# ── session mode ─────────────────────────────────────────────────────────────
TYPE="$MODE"

if [ "$TYPE" = "model-info" ]; then
  PRIMITIVE_KEY="model-info"
  PRIMITIVE_DATA=$(python3 "$EXTRACTOR" "$ETX_FILE" "$MODEL" "$TYPE" 2>&1) || {
    echo "ERROR extracting primitive: $PRIMITIVE_DATA"
    exit 1
  }
else
  if [ -z "$INDEX" ]; then
    echo "ERROR: index required for type '$TYPE'"
    echo "Example: $0 '$CONTAINER' '$MODEL' $TYPE 0"
    exit 1
  fi
  PRIMITIVE_KEY="${TYPE}-${INDEX}"
  PRIMITIVE_DATA=$(python3 "$EXTRACTOR" "$ETX_FILE" "$MODEL" "$TYPE" "$INDEX" 2>&1) || {
    echo "ERROR extracting primitive: $PRIMITIVE_DATA"
    exit 1
  }
fi

# Load current rules
RULES_FILE="$SKILLS_DIR/${TYPE}.md"
if [ -f "$RULES_FILE" ]; then
  CURRENT_RULES=$(cat "$RULES_FILE")
else
  CURRENT_RULES="(no rules yet — this is the first session for type '$TYPE')"
fi

# Session directory
PRIMITIVE_DIR="$MODEL_SESSIONS_DIR/$PRIMITIVE_KEY"
mkdir -p "$PRIMITIVE_DIR"

SESSION=$(( $(find "$PRIMITIVE_DIR" -maxdepth 1 -name "session-*" -type d 2>/dev/null | wc -l) + 1 ))
SESSION_DIR="$PRIMITIVE_DIR/session-${SESSION}"
mkdir -p "$SESSION_DIR"

SPEC_NAME="${TYPE}-${INDEX:-info}-session-${SESSION}"
SPEC_PATH="$BROWSER_DIR/tests/primitives/${SPEC_NAME}.spec.ts"

# Accumulated bin status note
if [ -f "$ACCUMULATED_BIN" ]; then
  ACCUM_BYTES=$(wc -c < "$ACCUMULATED_BIN")
  ACCUM_NOTE="EXISTS (${ACCUM_BYTES} bytes) — upload this before editing"
else
  ACCUM_NOTE="does not exist — use navigateCreateModelWizard() to create a fresh model"
fi

echo "[learn] Model:     $MODEL"
echo "[learn] Primitive: $PRIMITIVE_KEY"
echo "[learn] Session:   $SESSION"
echo "[learn] Dir:       $SESSION_DIR"
echo "[learn] Playwright:${HEADED_NOTE} ${PLAYWRIGHT_FLAGS}"
echo ""

# ── Build PROMPT.md ───────────────────────────────────────────────────────────
PROMPT_FILE="$SESSION_DIR/PROMPT.md"

cat > "$PROMPT_FILE" << PROMPT_EOF
# Primitive Migration Session

**Model:** $MODEL
**Container:** $ETX_FILE
**Primitive:** $PRIMITIVE_KEY
**Session:** $SESSION
**Migrator root:** $ROOT

---

## Goal

Enter exactly ONE primitive from this EdgeTX model into the Ethos WASM emulator UI
by driving Playwright. The firmware serialises correctly — no binary work needed.

Do NOT modify any other primitives. Load the accumulated state, add this one
primitive, save the result.

---

## Accumulated State

Path: \`$ACCUMULATED_BIN\`
Status: $ACCUM_NOTE

If it EXISTS: upload it via the Upload button before making any changes.
If it does NOT exist: call \`navigateCreateModelWizard(page)\` to start fresh.

After successfully entering the primitive, download the model .bin and write it to
\`$ACCUMULATED_BIN\` using \`fs.writeFileSync\`.

---

## ETX Primitive Data

\`\`\`yaml
$PRIMITIVE_DATA
\`\`\`

---

## Current Mapping Rules for type: $TYPE

\`\`\`
$CURRENT_RULES
\`\`\`

---

## Playwright Infrastructure

Browser dir: \`$BROWSER_DIR/\`

Helpers (import with path relative to your spec in \`tests/primitives/\`):
- \`../helpers/boot\` — \`bootApp(page)\`, \`navigateCreateModelWizard(page)\`
- \`../helpers/navigate\` — \`tapBitmap(page,x,y)\`, \`touchBitmap(page,x,y)\`, \`swipeCanvas(page,'left'|'right')\`
- \`../helpers/upload\` — \`uploadFile(page, 'model', path)\`
- \`../helpers/download\` — \`downloadToBuffer(download)\`, \`clickDownloadMenuItem(page, MENU.modelFile)\`

Write your spec to:
  \`$SPEC_PATH\`

Run it with:
\`\`\`bash
cd $BROWSER_DIR
npx playwright test tests/primitives/${SPEC_NAME}.spec.ts $PLAYWRIGHT_FLAGS
\`\`\`
$HEADED_NOTE

Screenshots and traces land in \`$BROWSER_DIR/test-results/\`.

Emulator URL: https://ethos.studio1247.com/1.6.6/X18RS_FCC

---

## Key Navigation Facts

(from confirmed coordinates in \`$ROOT/skills/ethos-ui-navigation.md\`)

- Canvas bitmap space: 800×480
- Most nav (menus, back arrow, list rows): \`tapBitmap\`
- Keyboard keys, Mixes/Vars context menu items: \`touchBitmap\`
- Bottom nav → Model Setup: \`tapBitmap(page, 194, 459)\`
- Page 2 of Model Setup (Vars/Curves/Logic switches/SF): swipe left from page 1
- Back arrow: \`tapBitmap(page, 25, 25)\`
- After entering all fields: \`clickDownloadMenuItem(page, MENU.modelFile)\` then save

---

## Workflow

1. **Read** the primitive data and current rules
2. **Write** the Playwright spec at \`$SPEC_PATH\`
   - Boot the emulator (\`bootApp\`)
   - Upload accumulated.bin if it exists, or run wizard if not
   - Navigate to the right screen for this primitive type
   - Enter all field values from the ETX data
   - Take a screenshot to verify each field
   - Download the model .bin and write it to \`$ACCUMULATED_BIN\`
3. **Run** the spec
4. **Read** screenshots from test-results — confirm fields are correct
5. **Update** \`$RULES_FILE\` with confirmed steps or failure notes
6. **Write** \`$SESSION_DIR/result.txt\`:
   - \`SUCCESS\` — primitive entered and screenshot confirms it
   - \`LEARN: <what to change next session>\` — something failed

---

## Output Files (mandatory before ending)

| File | Content |
|------|---------|
| \`$SESSION_DIR/result.txt\` | SUCCESS or LEARN: notes |
| \`$RULES_FILE\` | Updated mapping rules for type '$TYPE' |
| \`$ACCUMULATED_BIN\` | Updated model .bin (only on SUCCESS) |
PROMPT_EOF

# ── Write session CLAUDE.md ───────────────────────────────────────────────────
cat > "$SESSION_DIR/CLAUDE.md" << 'CLAUDEMD'
# Primitive Migration Session

Read `PROMPT.md` in this directory immediately and begin the primitive migration task.
Do not wait for further input — start at step 1 of the workflow.

Mandatory outputs before ending this session:
- `result.txt` in this directory (SUCCESS or LEARN: ...)
- The rules file for this primitive type (path is in PROMPT.md)
- `accumulated.bin` (path is in PROMPT.md) — only write on SUCCESS
CLAUDEMD

mkdir -p "$BROWSER_DIR/tests/primitives"

# Show previous result if this is a retry
if [ "$SESSION" -gt 1 ]; then
  PREV_RESULT="$PRIMITIVE_DIR/session-$((SESSION-1))/result.txt"
  if [ -f "$PREV_RESULT" ]; then
    echo "Last session result:"
    cat "$PREV_RESULT"
    echo ""
  fi
fi

echo "Prompt: $PROMPT_FILE"
echo "Spec:   $SPEC_PATH"
echo ""
echo "Press ENTER to launch Claude, or Ctrl+C to cancel..."
read -r

echo ""
echo "[learn] Launching Claude in: $SESSION_DIR"
echo ""

cd "$SESSION_DIR"
claude \
  --dangerously-skip-permissions \
  --add-dir "$ROOT"

echo ""
echo "[learn] Session complete."
echo ""

RESULT_FILE="$SESSION_DIR/result.txt"
if [ -f "$RESULT_FILE" ]; then
  echo "Result: $(cat "$RESULT_FILE")"
else
  echo "Result: no result.txt written"
fi

echo ""
echo "To retry this primitive:"
echo "  $0 ${HEADED:+--headed }'$CONTAINER' '$MODEL' $TYPE ${INDEX:-}"
echo ""
echo "To check status of all primitives:"
echo "  $0 '$CONTAINER' '$MODEL' --status"
