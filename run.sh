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

# Verify .etx file exists
if [ ! -f "$ETX_FILE" ]; then
  echo "ERROR: Container file not found: $ETX_FILE"
  echo ""
  echo "Please place your EdgeTX .etx file at: $ETX_FILE"
  exit 1
fi

echo "[migrator] Container: $CONTAINER"
echo "[migrator] Model: $MODEL"
echo "[migrator] Working directory: $WORK_DIR"

# Create work directory
mkdir -p "$WORK_DIR"

# Calculate attempt number
ATTEMPT=1
if [ -d "$WORK_DIR" ]; then
  ATTEMPT=$(($(ls -d "$WORK_DIR"/attempt-* 2>/dev/null | wc -l) + 1))
fi

echo "[migrator] Attempt: $ATTEMPT"

if [ "$FEEDBACK_MODE" = "--feedback" ]; then
  # Feedback mode: collect feedback from previous attempt
  echo ""
  echo "=== FEEDBACK COLLECTION ==="
  echo ""
  echo "Did the model load on the radio? (yes/no)"
  read -r LOADED

  echo ""
  echo "Any errors in the UI or control responses? (describe)"
  read -r ERRORS

  echo ""
  echo "Which sections worked? (inputs/mixes/trims/outputs - comma separated, or 'all')"
  read -r SECTIONS_OK

  echo ""
  echo "What should we fix? (brief notes)"
  read -r FIXES

  FEEDBACK_FILE="$WORK_DIR/attempt-$((ATTEMPT-1))_feedback.txt"
  {
    echo "=== Feedback for Attempt $((ATTEMPT-1)) ==="
    echo "Date: $(date)"
    echo ""
    echo "Loaded on radio: $LOADED"
    echo "Errors: $ERRORS"
    echo "Sections working: $SECTIONS_OK"
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
PROMPT_FILE="/tmp/${MODEL}-attempt-${ATTEMPT}-prompt.md"

# Read template and perform substitutions
sed \
  -e "s|{CONTAINER}|$CONTAINER|g" \
  -e "s|{MODEL}|$MODEL|g" \
  -e "s|{ATTEMPT}|$ATTEMPT|g" \
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

echo "[migrator] Prompt ready: $PROMPT_FILE"
echo ""
echo "=== STARTING CLAUDE CODE SESSION ==="
echo ""
echo "Session will:"
echo "  1. Extract model YAML from $CONTAINER"
echo "  2. Analyze the $MODEL model structure"
echo "  3. Generate attempt-$ATTEMPT.bin"
echo "  4. Test with WASM harness"
echo "  5. Report results"
echo ""
echo "After Claude finishes:"
echo "  1. Review the test report in the session output"
echo "  2. Copy attempt-$ATTEMPT.bin to your radio"
echo "  3. Test the model"
echo "  4. Run: $0 $CONTAINER $MODEL --feedback"
echo ""
echo "Working directory: $WORK_DIR"
echo ""
echo "Press ENTER to continue, or Ctrl+C to cancel..."
read -r

# Start Claude Code session
# The session will have:
# - CLAUDE.md as context
# - The templated prompt
# - Access to skills/
# - Working directory set to model dir
cd "$WORK_DIR"

echo "[migrator] Launching Claude Code..."
echo ""

# Show the prompt file for reference
echo "=== PROMPT FOR CLAUDE ==="
echo ""
head -30 "$PROMPT_FILE"
echo ""
echo "... (see full prompt at $PROMPT_FILE)"
echo ""
echo "=== END PROMPT ==="
echo ""

# Launch claude code with the prompt
# Copy prompt to working directory so it's accessible
cp "$PROMPT_FILE" "$WORK_DIR/PROMPT.md"

echo "[migrator] Starting Claude Code session..."
echo ""
echo "Prompt copied to: $WORK_DIR/PROMPT.md"
echo ""

# Start Claude Code in the working directory
# Pass the prompt via stdin so Claude receives it as the initial message
cd "$WORK_DIR"
cat "$PROMPT_FILE" | claude code \
  --dangerously-skip-permissions \
  --add-dir "$DIR"

echo ""
echo "[migrator] Claude session complete."
echo ""
echo "Check results:"
echo "  Test report: cat $WORK_DIR/attempt-$ATTEMPT"_test_report.json
echo "  Binary file: $WORK_DIR/attempt-$ATTEMPT.bin"
echo ""
echo "Next: Download the .bin file, test on radio, then:"
echo "  $0 $CONTAINER $MODEL --feedback"
echo ""
