# Ethos Model Migrator — Reverse Engineering Workflow

## Overview

This project automates the reverse-engineering of EdgeTX model files (.etx, YAML format) into Ethos binary format (.bin). Each model is tackled in a **fresh Claude Code session** with templated guidance, then tested against the WASM firmware until it loads without errors.

## Project Goals

- Generate valid Ethos .bin files from EdgeTX .etx YAML source
- Validate via WASM harness (firmware round-trip test)
- Iterate until model loads as active on radio without errors
- Capture lessons learned to improve future attempts
- Build a reusable library of working examples

## Directory Structure

```
migrator/
├── run.sh                    # Entry point: ./run.sh <model-name> [--feedback]
├── CLAUDE.md                 # This file
├── skills/                   # Symlink to ../spike/skills/
│   ├── ethos-bin-format.md         # Ethos binary format reference
│   └── edgetx-ethos-migration.md   # EdgeTX → Ethos concepts
├── lib/
│   ├── etx-parser.py         # Parse .etx YAML → structured data
│   └── feedback-collector.py # Gather and store feedback
├── templates/
│   ├── reverse-engineer.md   # Main prompt template (per-model)
│   ├── mistakes-and-lessons.md # Common pitfalls and solutions
│   └── reference-models.md   # Known good examples
├── models/
│   ├── bamf2/
│   │   ├── bamf2.etx         # Source model (user provides)
│   │   ├── attempt-1.bin     # Generated output
│   │   ├── attempt-1_test_report.json
│   │   └── attempt-1_feedback.txt
│   └── [other models]/
├── sessions/                 # Store Claude session transcripts (optional)
└── docs/
    └── workflow.md           # Detailed usage guide
```

## How It Works

### 1. Start a New Reverse-Engineering Session

```bash
cd ~/source/ethos/migrator
./run.sh bamf2
```

**What the script does:**
- Checks that `models/bamf2/bamf2.etx` exists
- Parses the .etx file → extracts model structure
- Fills in the prompt template with model-specific data
- Starts a **fresh Claude Code session** with:
  - This CLAUDE.md (context + instructions)
  - Template prompt (with bamf2 data injected)
  - Reference skills files and examples
  - Pre-populated memory about project and lessons learned
- Claude generates `attempt-N.bin` and tests it

### 2. Iterate Based on Firmware Results

The templated prompt guides Claude to:
1. Analyze the EdgeTX source structure
2. Generate an Ethos .bin file matching that structure
3. Test via `! node test-model.js attempt-N.bin`
4. Interpret the test report (pass/fail, byte diffs)
5. Fix issues and regenerate until it passes
6. Report findings

### 3. Test on Radio

After Claude's session completes (when firmware test passes):
1. Download the `.bin` file to your radio
2. Set it as the active model
3. Check for errors: inputs work, mixes work, trims work, etc.
4. Note any issues

### 4. Provide Feedback

```bash
./run.sh bamf2 --feedback
```

**Interactive prompts ask:**
- Did the model load successfully? (yes/no)
- Any errors in the UI or on sticks? (free text)
- Which sections failed? (checkboxes)
- What should we fix? (free text)

Results saved to `models/bamf2/attempt-N_feedback.txt` and automatically used to update:
- `templates/mistakes-and-lessons.md` (lessons for next attempt)
- `skills/edgetx-ethos-migration.md` (migration patterns)
- `skills/ethos-bin-format.md` (format discoveries)

### 5. Next Attempt

```bash
./run.sh bamf2
```

The new session reads the updated mistakes/lessons and tries again with fresh context + accumulated knowledge.

---

## Key Files You Need to Provide

### For each model:

- **`models/<model>/<model>.etx`** — The source EdgeTX model file (YAML format)
  - Extract from your existing OpenTX/EdgeTX config

## What Claude Gets in Each Session

1. **This file (CLAUDE.md)** — Project overview and workflow
2. **`templates/reverse-engineer.md`** — Templated prompt, pre-filled with:
   - Model name and attempt number
   - Parsed .etx structure
   - 1-2 reference .bin files for comparison
   - Known issues from prior attempts
3. **`skills/*.md`** — Complete binary format reference
4. **Memory** — Project lessons, past mistakes, patterns that worked

## Session Workflow (What Claude Does)

Each session:
1. Reads the injected prompt → understands the model structure
2. Reviews skills files → understands binary format
3. Generates `.bin` file using the format spec
4. Tests immediately: `! node test-model.js`
5. Analyzes test report → pass/fail/byte diffs
6. If failed: identifies issue, fixes, regenerates
7. Reports findings and recommendations

Expected time per attempt: **~30–60 minutes** depending on complexity.

---

## Success Criteria

✓ Firmware accepts model without errors
✓ WASM harness test status = `PASS`
✓ Byte-for-byte identical (0 changes) after round-trip
✓ Model loads on radio as active model
✓ No errors in UI or control responses

---

## Command Reference

```bash
# Start new reverse-engineering session for a model
./run.sh <model-name>

# Provide feedback after radio testing
./run.sh <model-name> --feedback

# Check test results for last attempt
cat models/<model>/attempt-*_test_report.json

# View lessons learned so far
cat templates/mistakes-and-lessons.md

# Manual test (don't use run.sh)
node ../spike/test-model.js models/<model>/attempt-N.bin
```

---

## Troubleshooting

**"models/bamf2/bamf2.etx not found"**
- Place your EdgeTX .etx file at `models/bamf2/bamf2.etx`

**Claude session doesn't start**
- Check you're in the migrator/ directory
- Verify Claude Code CLI is installed: `which claude-code`

**Test harness fails with "wasm_radio.bin not found"**
- Copy from spike: `cp ../spike/wasm_radio.bin .`

**Firmware test shows "FAIL — sentinel error detected"**
- Check the Python validator output in `attempt-N_validation.txt`
- Issue is likely in binary structure (wrong offsets, bad CRC, etc.)
- Claude will diagnose from test report

---

## Project Memory

Lessons learned across all models are stored in project memory:
- `skills/mistakes-and-lessons.md` — What went wrong and how to fix it
- `skills/edgetx-ethos-migration.md` — EdgeTX concepts mapped to Ethos
- `skills/ethos-bin-format.md` — Binary format (reference, updated with discoveries)

These files auto-update as you test models and provide feedback.

---

## Next Steps

1. Place your first .etx model in `models/<model>/<model>.etx`
2. Run: `./run.sh <model-name>`
3. Wait for Claude to generate and test
4. Download the .bin file and test on radio
5. Provide feedback: `./run.sh <model-name> --feedback`
6. Repeat
