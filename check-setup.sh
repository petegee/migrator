#!/bin/bash
# Quick setup verification for migrator project

set +e  # Don't exit on first error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Ethos Model Migrator — Dependency Check              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0

check() {
  local name=$1
  local cmd=$2
  local required=${3:-1}  # 1 = required, 0 = optional

  if eval "$cmd" &>/dev/null; then
    echo "  ✓ $name"
    ((PASSED++))
  else
    if [ $required -eq 1 ]; then
      echo "  ✗ $name (REQUIRED)"
      ((FAILED++))
    else
      echo "  ⊘ $name (optional)"
    fi
  fi
}

# Project files
echo "Project Structure:"
check "CLAUDE.md" "[ -f CLAUDE.md ]"
check "README.md" "[ -f README.md ]"
check "SETUP.md" "[ -f SETUP.md ]"
check "run.sh executable" "[ -x run.sh ]"
check "lib/etx-parser.py" "[ -f lib/etx-parser.py ]"
check "skills (symlinked)" "[ -d skills ]"
check "templates/" "[ -d templates ]"
check "models/" "[ -d models ]"

echo ""
echo "lib/ (runtime files):"
check "WASM firmware" "[ -f lib/X18RS_FCC.wasm ]"
check "WASM JS wrapper" "[ -f lib/X18RS_FCC_patched.js ]"
check "Test harness" "[ -f lib/test-model.js ]"
check "Radio settings" "[ -f lib/wasm_radio.bin ]"
check "Decompiled WAT" "[ -f lib/out.wat ]" 0  # optional, 143 MB

echo ""
echo "reference-models/ (known good .bin files):"
check "Reference: 1chnl.bin" "[ -f reference-models/1chnl.bin ]" 0

echo ""
echo "System Tools:"

check "Python 3" "python3 --version"
check "PyYAML" "python3 -c 'import yaml'"
check "Node.js" "node --version"
check "Claude CLI" "which claude || which claude-code"

echo ""
echo "Summary:"
echo "  ✓ Passed: $PASSED"
if [ $FAILED -gt 0 ]; then
  echo "  ✗ Failed: $FAILED (required)"
  echo ""
  echo "Setup incomplete. See SETUP.md for troubleshooting."
  exit 1
else
  echo "  ✗ Failed: 0"
  echo ""
  echo "✓ All checks passed! Ready to migrate models."
  echo ""
  echo "Next steps:"
  echo "  1. Place your EdgeTX model: cp model.etx models/<name>/"
  echo "  2. Start reverse-engineering: ./run.sh <name>"
  echo ""
  exit 0
fi
