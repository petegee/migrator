#!/bin/bash
# Migrator workflow: start reverse-engineering session for a model from an .etx container
# Usage:
#   ./run.sh <container.etx> <model-name>              # Start new attempt
#   ./run.sh <container.etx> <model-name> --feedback   # Provide feedback after radio testing

set -e

CONTAINER=${1:-}
MODEL=${2:-}
FEEDBACK_MODE=${3:-}

if [ -z "$CONTAINER" ] || [ -z "$MODEL" ]; then
  echo "Usage: $0 <container.etx> <model-name> [--feedback]"
  echo ""
  echo "Examples:"
  echo "  $0 models/bamf2.etx bamf2              # Start reverse-engineering session"
  echo "  $0 models/bamf2.etx bamf2 --feedback   # Provide feedback after testing"
  echo ""
  echo "Note: .etx is a ZIP container with multiple model YAML files."
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
ETX_FILE="$DIR/$CONTAINER"
WORK_DIR="$DIR/models/$(basename "$CONTAINER" .etx)_$MODEL"

# Sanitised model name for directory/file naming (spaces → underscores)
MODEL_SAFE="${MODEL// /_}"

# Verify .etx file exists
if [ ! -f "$ETX_FILE" ]; then
  echo "ERROR: Container file not found: $ETX_FILE"
  echo ""
  echo "Please place your EdgeTX .etx file at: $ETX_FILE"
  exit 1
fi

# Create work directory
mkdir -p "$WORK_DIR"

# Calculate attempt number by counting existing attempt directories
ATTEMPT=$(($(ls -d "$WORK_DIR/${MODEL_SAFE}_attempt_"* 2>/dev/null | wc -l) + 1))

ATTEMPT_DIR="$WORK_DIR/${MODEL_SAFE}_attempt_${ATTEMPT}"

echo "[migrator] Container: $CONTAINER"
echo "[migrator] Model: $MODEL"
echo "[migrator] Attempt: $ATTEMPT"
echo "[migrator] Attempt directory: $ATTEMPT_DIR"

if [ "$FEEDBACK_MODE" = "--feedback" ]; then
  # Feedback mode: collect feedback from previous attempt
  PREV=$((ATTEMPT-1))
  if [ "$PREV" -lt 1 ]; then
    echo "ERROR: No previous attempt found to give feedback on."
    exit 1
  fi

  PREV_DIR="$WORK_DIR/${MODEL_SAFE}_attempt_${PREV}"
  if [ ! -d "$PREV_DIR" ]; then
    echo "ERROR: Previous attempt directory not found: $PREV_DIR"
    exit 1
  fi

  echo ""
  echo "=== FEEDBACK COLLECTION FOR ATTEMPT $PREV ==="
  echo ""
  echo "--- Part 1: Model visible on select screen ---"
  echo "Did the model appear in the model select list on the radio? (yes/no)"
  read -r PART1_VISIBLE

  if [ "$PART1_VISIBLE" = "no" ]; then
    echo ""
    echo "Model was not visible on the select screen."
    echo "What did you see instead? (e.g. blank list, error message, corrupted entry)"
    read -r PART1_DETAIL
    PART2_SELECTED="n/a (model not visible)"
    PART2_INVALID_DATA="n/a"
    PART2_DETAIL=""
    SECTIONS_OK="none"
    FIXES="Model not visible on select screen: $PART1_DETAIL"
  else
    PART1_DETAIL="appeared normally"

    echo ""
    echo "--- Part 2: Model loads on selection ---"
    echo "After selecting the model, did it load without an 'Invalid Data' error? (yes/no)"
    read -r PART2_SELECTED

    if [ "$PART2_SELECTED" = "no" ]; then
      PART2_INVALID_DATA="yes"
      echo ""
      echo "What error was shown? (exact text if possible)"
      read -r PART2_DETAIL
      SECTIONS_OK="none"
      echo ""
      echo "What should we fix? (brief notes)"
      read -r FIXES
    else
      PART2_INVALID_DATA="no"
      PART2_DETAIL="loaded cleanly"

      echo ""
      echo "--- Functional check ---"
      echo "Which sections worked correctly? (inputs/mixes/trims/outputs - comma separated, or 'all')"
      read -r SECTIONS_OK

      echo ""
      echo "Any errors in control responses or UI behaviour? (describe, or 'none')"
      read -r ERRORS

      echo ""
      echo "What should we fix? (brief notes, or 'nothing')"
      read -r FIXES
    fi
  fi

  FEEDBACK_FILE="$PREV_DIR/attempt-${PREV}_feedback.txt"
  {
    echo "=== Feedback for Attempt $PREV ==="
    echo "Date: $(date)"
    echo ""
    echo "Part 1 — model visible on select screen: $PART1_VISIBLE ($PART1_DETAIL)"
    echo "Part 2 — model loaded without Invalid Data: $PART2_SELECTED ($PART2_DETAIL)"
    echo "Invalid Data error shown: $PART2_INVALID_DATA"
    echo "Sections working: $SECTIONS_OK"
    if [ -n "$ERRORS" ]; then echo "Control/UI errors: $ERRORS"; fi
    echo "Fixes needed: $FIXES"
  } | tee "$FEEDBACK_FILE"

  echo ""
  echo "[migrator] Feedback saved: $FEEDBACK_FILE"
  echo ""
  echo "Next iteration will use this feedback to improve."
  echo ""
  echo "To start the next reverse-engineering attempt:"
  echo "  $0 $CONTAINER $MODEL"
  exit 0
fi

# Normal mode: prepare and start Claude session

# Parse .etx structure
echo "[migrator] Parsing model structure from container..."
set +e
PARSE_OUTPUT=$(python3 "$DIR/lib/etx-parser.py" "$ETX_FILE" "$MODEL" 2>&1)
PARSE_EXIT=$?
set -e

if [ $PARSE_EXIT -ne 0 ]; then
  printf "\n%s\n\n" "$PARSE_OUTPUT"
  exit 1
fi

ETX_STRUCTURE="$PARSE_OUTPUT"

# Fill in prompt template
echo "[migrator] Preparing prompt template..."
PROMPT_FILE="/tmp/${MODEL_SAFE}-attempt-${ATTEMPT}-prompt.md"

sed \
  -e "s|{CONTAINER}|$CONTAINER|g" \
  -e "s|{MODEL}|$MODEL|g" \
  -e "s|{ATTEMPT}|$ATTEMPT|g" \
  -e "s|{DIR}|$DIR|g" \
  < "$DIR/templates/reverse-engineer.md" > "$PROMPT_FILE"

# Append ETX structure to prompt
{
  echo ""
  echo "## Parsed Model Structure"
  echo ""
  echo '```'
  echo "$ETX_STRUCTURE"
  echo '```'
} >> "$PROMPT_FILE"

# Create attempt directory and copy prompt into it
mkdir -p "$ATTEMPT_DIR"
cp "$PROMPT_FILE" "$ATTEMPT_DIR/PROMPT.md"

echo "[migrator] Prompt ready: $ATTEMPT_DIR/PROMPT.md"
echo ""
echo "=== STARTING CLAUDE CODE SESSION ==="
echo ""
echo "Session will:"
echo "  1. Analyze the $MODEL model structure"
echo "  2. Generate attempt-${ATTEMPT}.bin in $ATTEMPT_DIR"
echo "  3. Test with WASM harness"
echo "  4. Report results"
echo ""
echo "After Claude finishes:"
echo "  1. Review the test report in $ATTEMPT_DIR"
echo "  2. Copy attempt-${ATTEMPT}.bin to your radio"
echo "  3. Test the model"
echo "  4. Run: $0 $CONTAINER $MODEL --feedback"
echo ""
echo "Press ENTER to continue, or Ctrl+C to cancel..."
read -r

echo "[migrator] Launching Claude Code in: $ATTEMPT_DIR"
echo ""

cd "$ATTEMPT_DIR"
cat "$PROMPT_FILE" | claude code \
  --dangerously-skip-permissions \
  --add-dir "$DIR"

echo ""
echo "[migrator] Claude session complete."
echo ""
echo "Check results:"
echo "  Test report: $ATTEMPT_DIR/attempt-${ATTEMPT}_test_report.json"
echo "  Binary file: $ATTEMPT_DIR/attempt-${ATTEMPT}.bin"
echo ""
echo "Next: Download the .bin file, test on radio, then:"
echo "  $0 $CONTAINER $MODEL --feedback"
echo ""
