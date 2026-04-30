#!/usr/bin/env bash
# probe.sh — Run one UI navigation probe and copy screenshots to results/
#
# Usage:
#   ./probe.sh <name>                       run existing probe
#   ./probe.sh new <name> "<description>"   scaffold a new probe then run it

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BROWSER_DIR="$SCRIPT_DIR/../browser"
PROBES_DIR="$BROWSER_DIR/tests/ui-nav"
RESULTS_DIR="$SCRIPT_DIR/results"

# ── helpers ─────────────────────────────────────────────────────────────────

usage() {
  echo "Usage:"
  echo "  ./probe.sh <name>                       run existing probe"
  echo "  ./probe.sh new <name> \"<description>\"   scaffold + run new probe"
  echo ""
  echo "Available probes:"
  ls "$PROBES_DIR"/*.spec.ts 2>/dev/null | xargs -I{} basename {} .spec.ts || echo "  (none yet)"
  exit 1
}

scaffold_probe() {
  local name="$1"
  local description="$2"
  local spec="$PROBES_DIR/${name}.spec.ts"

  if [ -f "$spec" ]; then
    echo "Probe already exists: $spec"
    return
  fi

  cat > "$spec" <<SPEC
/**
 * Probe: ${description}
 *
 * Goal: confirm bitmap coordinates and interaction type for this action.
 * Attach before/after screenshots as test attachments.
 * No assertions needed — just capture evidence.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap } from '../helpers/navigate';

test('probe: ${description}', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // ── Navigate to the target screen ───────────────────────────────────────
  // TODO: add navigation steps here

  const before = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('before', { body: before, contentType: 'image/png' });

  // ── Perform the action ──────────────────────────────────────────────────
  // TODO: add action here (tapBitmap or touchBitmap)
  // await tapBitmap(page, X, Y);
  // await touchBitmap(page, X, Y);
  await page.waitForTimeout(600);

  const after = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after', { body: after, contentType: 'image/png' });
});
SPEC

  echo "Scaffolded: $spec"
}

copy_results() {
  local name="$1"
  local dest="$RESULTS_DIR/$name"
  mkdir -p "$dest"

  # Copy all attachments from the test-results directory for this probe
  local tr_dir
  tr_dir=$(find "$BROWSER_DIR/test-results" -maxdepth 1 -type d -name "ui-nav-${name}-*" 2>/dev/null | sort -r | head -1)

  if [ -z "$tr_dir" ]; then
    echo "No test-results directory found for probe '$name'"
    return
  fi

  cp -r "$tr_dir"/. "$dest/" 2>/dev/null || true
  echo "Results copied to: $dest"
  echo "Screenshots:"
  find "$dest" -name "*.png" | while read -r f; do echo "  $f"; done
}

# ── main ────────────────────────────────────────────────────────────────────

if [ $# -eq 0 ]; then usage; fi

if [ "$1" = "new" ]; then
  [ $# -lt 3 ] && usage
  NAME="$2"
  DESC="$3"
  scaffold_probe "$NAME" "$DESC"
else
  NAME="$1"
fi

SPEC_FILE="$PROBES_DIR/${NAME}.spec.ts"
if [ ! -f "$SPEC_FILE" ]; then
  echo "Probe spec not found: $SPEC_FILE"
  echo "Run: ./probe.sh new $NAME \"<description>\" to create it"
  exit 1
fi

echo "Running probe: $NAME"
echo "Spec: $SPEC_FILE"
echo ""

cd "$BROWSER_DIR"
npx playwright test "tests/ui-nav/${NAME}.spec.ts" \
  --reporter=list \
  --project=chromium \
  2>&1 || true   # don't exit on test failure — we want to see the screenshots

copy_results "$NAME"
