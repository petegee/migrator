#!/usr/bin/env bash
#
# investigate.sh
#
# Runs a Playwright investigation spec to capture binary diffs from the ETHOS
# browser UI, then launches a Claude Code session to interpret the diffs and
# update browser/findings/field-map.md.
#
# Usage:
#   ./investigate.sh <spec>             Run test + interpret diffs
#   ./investigate.sh --no-test <spec>   Interpret existing diffs only
#
# Examples:
#   ./investigate.sh 00-model-type
#   ./investigate.sh 01-model-name
#   ./investigate.sh --no-test 00-model-type

set -euo pipefail

MIGRATOR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BROWSER_DIR="$MIGRATOR_DIR/browser"
FINDINGS_DIR="$BROWSER_DIR/findings"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

usage() {
  cat <<EOF

Usage: $0 [--no-test] <spec-name>

Options:
  --no-test   Skip running Playwright — interpret diffs already in findings/diffs/

Available specs:
$(ls "$BROWSER_DIR/tests/investigate/"*.spec.ts 2>/dev/null \
    | xargs -n1 basename | sed 's/\.spec\.ts//' | sed 's/^/  /' || echo "  (none found)")

Examples:
  $0 00-model-type
  $0 01-model-name
  $0 --no-test 00-model-type
EOF
  exit 1
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

RUN_TEST=true
SPEC=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-test) RUN_TEST=false; shift ;;
    --help|-h) usage ;;
    -*)        echo "Unknown option: $1"; usage ;;
    *)         SPEC="$1"; shift ;;
  esac
done

[[ -z "$SPEC" ]] && usage

SPEC_FILE="$BROWSER_DIR/tests/investigate/${SPEC}.spec.ts"
if [[ ! -f "$SPEC_FILE" ]]; then
  echo "✗ Spec not found: $SPEC_FILE"
  usage
fi

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

echo ""
echo "▶ Pre-flight checks..."

# Load browser/.env so we can inspect the key before Playwright does
if [[ -f "$BROWSER_DIR/.env" ]]; then
  set +o nounset
  # shellcheck disable=SC1091
  source <(grep -v '^#' "$BROWSER_DIR/.env" | grep '=' | sed 's/^/export /')
  set -o nounset
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo ""
  echo "✗ ANTHROPIC_API_KEY is not set in browser/.env"
  echo ""
  echo "  Fix:"
  echo "    echo \"ANTHROPIC_API_KEY=sk-ant-...\" > $BROWSER_DIR/.env"
  echo ""
  exit 1
fi
echo "  ✓ ANTHROPIC_API_KEY present (${ANTHROPIC_API_KEY:0:18}...)"

# Quick connectivity check — one lightweight models list call
echo "  ✓ Checking API reachability..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  "https://api.anthropic.com/v1/models")
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo ""
  echo "✗ Anthropic API returned HTTP $HTTP_STATUS"
  echo "  Check your API key and account status at https://console.anthropic.com"
  echo ""
  exit 1
fi
echo "  ✓ API reachable (HTTP $HTTP_STATUS)"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Run the Playwright investigation test
# ---------------------------------------------------------------------------

if [[ "$RUN_TEST" == "true" ]]; then
  echo ""
  echo "▶ Running investigation: $SPEC"
  echo ""
  # cd to browser/ so Playwright finds playwright.config.ts and resolves
  # baseURL and testDir relative paths correctly.
  (cd "$BROWSER_DIR" && npx playwright test "tests/investigate/${SPEC}.spec.ts") || {
    echo ""
    echo "⚠  One or more tests failed — diff files may still have been written."
    echo "   Run: cd browser && npx playwright show-report"
    echo ""
  }
fi

# ---------------------------------------------------------------------------
# Step 2: Locate diff files produced by this spec
# ---------------------------------------------------------------------------

DIFF_FILES=()
while IFS= read -r -d '' f; do
  DIFF_FILES+=("$f")
done < <(find "$FINDINGS_DIR/diffs" -name "${SPEC}*.json" -print0 2>/dev/null | sort -z)

if [[ ${#DIFF_FILES[@]} -eq 0 ]]; then
  echo ""
  echo "✗ No diff files found matching browser/findings/diffs/${SPEC}*.json"
  echo "  Did the test run produce any diffs? Check test-results/ for failures."
  exit 1
fi

echo ""
echo "✓ Diff files ready:"
for f in "${DIFF_FILES[@]}"; do
  COUNT=$(python3 -c "import json; d=json.load(open('$f')); print(d['diffCount'])" 2>/dev/null || echo "?")
  echo "  $(basename "$f")  →  $COUNT byte(s) changed"
done

# ---------------------------------------------------------------------------
# Step 3: Build diff list for the session prompt
# ---------------------------------------------------------------------------

DIFF_LIST=""
for f in "${DIFF_FILES[@]}"; do
  REL="$(python3 -c "import os; print(os.path.relpath('$f', '$MIGRATOR_DIR'))")"
  ACTION=$(python3 -c "import json; d=json.load(open('$f')); print(d['action'])" 2>/dev/null || echo "unknown")
  DIFF_LIST="${DIFF_LIST}
- \`${REL}\` — ${ACTION}"
done

# ---------------------------------------------------------------------------
# Step 4: Create a session directory with CLAUDE.md
#
# We use a dedicated session dir rather than writing to the migrator root
# CLAUDE.md so the existing project context is not disturbed.
# ---------------------------------------------------------------------------

SESSION_DIR="$BROWSER_DIR/sessions/${SPEC}-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SESSION_DIR"

cat > "$SESSION_DIR/CLAUDE.md" << CLAUDEMD
# Investigation Session: ${SPEC}

You are helping reverse-engineer the FrSky ETHOS radio model .bin file format.

## Context

The ETHOS firmware stores model configuration in binary .bin files.
We are systematically making individual UI changes in the browser-based ETHOS
simulator, downloading the .bin before and after each change, and diffing the
two files to identify which bytes each field controls.

## Your task

1. Read the binary format reference:
   \`skills/ethos-bin-format.md\`

2. Read the current field map:
   \`browser/findings/field-map.md\`

3. Read each diff file listed below and interpret it:
${DIFF_LIST}

4. For each diff:
   - Identify which bytes changed and what they represent
   - Cross-reference with ethos-bin-format.md (content block starts at 0x10)
   - Note both the file-absolute offset AND the content-block-relative offset

5. Edit \`browser/findings/field-map.md\`:
   - Fill in the ⏳ rows for this investigation with byte offsets and values
   - Set status to ✅ (certain) or 🔍 (tentative)
   - Add new rows for any bytes not yet in the map
   - If a diff has 0 changed bytes, note it — the field may be runtime-only

Start by reading the first diff file now, then skills/ethos-bin-format.md,
then browser/findings/field-map.md.
CLAUDEMD

# ---------------------------------------------------------------------------
# Step 5: Launch Claude Code from the session directory
#
# --add-dir gives Claude access to the full migrator tree (skills/, browser/,
# lib/, etc.) even though we start from the session subdirectory.
# ---------------------------------------------------------------------------

echo ""
echo "▶ Launching Claude Code..."
echo "  Session dir : $SESSION_DIR"
echo "  Migrator    : $MIGRATOR_DIR"
echo ""
echo "Press ENTER to continue, or Ctrl+C to cancel..."
read -r

cd "$SESSION_DIR"
unset ANTHROPIC_API_KEY
claude \
  --model claude-haiku-4-5 \
  --dangerously-skip-permissions \
  --add-dir "$MIGRATOR_DIR"

echo ""
echo "▶ Session complete."
echo "  Findings    : browser/findings/field-map.md"
echo "  Test report : npx --prefix browser playwright show-report"
echo ""
