#!/usr/bin/env bash
# investigate.sh — Run one binary format investigation
#
# Usage:
#   ./investigate.sh <name>   run existing investigation spec

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BROWSER_DIR="$SCRIPT_DIR/../browser"

usage() {
  echo "Usage: ./investigate.sh <name>"
  echo ""
  echo "Available investigations:"
  ls "$BROWSER_DIR/tests/investigate"/*.spec.ts 2>/dev/null \
    | xargs -I{} basename {} .spec.ts || echo "  (none)"
  exit 1
}

[ $# -eq 0 ] && usage

NAME="$1"
SPEC="$BROWSER_DIR/tests/investigate/${NAME}.spec.ts"

if [ ! -f "$SPEC" ]; then
  echo "Spec not found: $SPEC"
  exit 1
fi

echo "Running investigation: $NAME"
echo ""

cd "$BROWSER_DIR"
npx playwright test "tests/investigate/${NAME}.spec.ts" \
  --reporter=list \
  --project=chromium \
  2>&1 || true

echo ""
echo "Diff output:"
DIFF_FILE="$BROWSER_DIR/findings/diffs/${NAME}.json"
if [ -f "$DIFF_FILE" ]; then
  cat "$DIFF_FILE"
else
  echo "  No diff file found at $DIFF_FILE"
  echo "  Check test-results/ for screenshots and attachments."
fi
