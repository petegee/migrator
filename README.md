# Ethos Model Migrator

**Automated reverse-engineering of EdgeTX models (.etx) to Ethos binary format (.bin)**

This project helps you systematically convert your radio model configurations from EdgeTX/OpenTX format into Ethos binary files that work on your FrSky radio. Each model is reverse-engineered in a fresh Claude Code session, tested against the firmware, and iterated until it loads on the radio without errors.

## Quick Start

### 1. Check Dependencies

```bash
./check-setup.sh   # Run this first to verify all tools
```

See `SETUP.md` for detailed requirements and troubleshooting.

### 2. Add Your First Model

```bash
# Copy your EdgeTX .etx file
mkdir -p models/bamf2
cp ~/path/to/bamf2.etx models/bamf2/
```

### 3. Start Reverse-Engineering

```bash
./run.sh bamf2
```

This will:
- Parse your model structure
- Start a Claude Code session with guided prompt
- Claude generates and tests a .bin file
- You iterate based on feedback

### 4. Test on Radio

After Claude's firmware test passes:
1. Download the `.bin` file
2. Load on your radio as a model
3. Test: do inputs work? Do mixes work?

### 5. Provide Feedback (Optional)

```bash
./run.sh bamf2 --feedback
```

Your feedback updates the prompts and templates for next iteration.

## Documentation

- **`CLAUDE.md`** — Project overview, goals, context
- **`SETUP.md`** — Dependencies, setup, troubleshooting
- **`docs/workflow.md`** — Detailed step-by-step guide with examples
- **`templates/reverse-engineer.md`** — The prompt Claude uses (shows real example)
- **`templates/mistakes-and-lessons.md`** — Common pitfalls and solutions (auto-updated)
- **`templates/reference-models.md`** — Working examples to compare against
- **`skills/ethos-bin-format.md`** — Complete binary format reference (from spike project)
- **`skills/edgetx-ethos-migration.md`** — EdgeTX concepts and mapping

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│ You place: models/bamf2/bamf2.etx                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
         ./run.sh bamf2
                  │
     ┌────────────┴────────────┐
     ▼                         │
Parse .etx structure           │
Fill prompt template           │
                               │
     ┌───────────────────────────────────────────────┐
     │ ┌──────────────────────────────────────────┐ │
     │ │ Claude Code Session (Fresh context)      │ │
     │ │ - Analyze source structure               │ │
     │ │ - Generate attempt-1.bin                 │ │
     │ │ - Test: ! node ../spike/test-model.js   │ │
     │ │ - Review: PASS/FAIL + byte diffs         │ │
     │ │ - Fix issues if needed                   │ │
     │ └──────────────────────────────────────────┘ │
     │  (repeats until firmware test passes)       │
     └───────────────────────────────────────────────┘
                               │
                    ▼──────────┴─────────┐
                    │                    ▼
            ✓ Firmware test         Download .bin
              passes: PASS           Load on radio
                    │                    │
                    │                    ▼
                    │             Test on hardware
                    │                    │
                    │                    ▼
                    │             ./run.sh bamf2 --feedback
                    │             (Collect findings)
                    │                    │
                    └────────────────────┘
                               │
                    ▼──────────┴─────────┐
                    │                    │
            Update lessons        Next iteration
            (mistakes, skills)    (attempt-2)
                    │
                    ▼
         Repeat until perfect
```

## Typical Workflow

### Scenario: Reverse-engineer a 4-mix model in 2 attempts

**Attempt 1 (30 min)**
```bash
# Morning
$ ./run.sh bamf2
# Claude session starts, generates attempt-1.bin
# Firmware test: PASS, diffCount=0, validation OK

# Afternoon
# Download attempt-1.bin, test on radio
# Result: Inputs are inverted

# Feedback
$ ./run.sh bamf2 --feedback
# "Inputs inverted" → saved for next attempt
```

**Attempt 2 (20 min)**
```bash
# Next session
$ ./run.sh bamf2
# Claude sees prior feedback: "inputs were inverted"
# Generates attempt-2.bin with fixes
# Firmware test: PASS, diffCount=0

# Download, test on radio
# Result: Perfect! All working.
```

**Total time: ~50 minutes for a working model.**

## Project Structure

```
migrator/
├── README.md                     # This file
├── CLAUDE.md                     # Project context + instructions
├── SETUP.md                      # Dependencies and setup
├── run.sh                        # Main entry point
├── check-setup.sh               # Dependency checker (run this first)
│
├── skills/                       # Symlinked to ../spike/skills/
│   ├── ethos-bin-format.md      # Binary format reference
│   └── edgetx-ethos-migration.md # EdgeTX → Ethos mapping
│
├── lib/                          # Utilities
│   └── etx-parser.py            # Parse EdgeTX YAML → structure
│
├── templates/                    # Prompt and reference docs
│   ├── reverse-engineer.md      # Main prompt (filled per-model)
│   ├── mistakes-and-lessons.md  # Pitfalls + solutions (auto-updated)
│   └── reference-models.md      # Working examples
│
├── models/                       # Your models (one per directory)
│   ├── bamf2/
│   │   ├── bamf2.etx            # Source (user provides)
│   │   ├── attempt-1.bin        # Generated
│   │   ├── attempt-1_test_report.json
│   │   ├── attempt-1_feedback.txt
│   │   └── ...
│   └── [other models]/
│
├── sessions/                     # Claude session transcripts (optional)
│   └── ...
│
└── docs/
    └── workflow.md              # Detailed step-by-step guide
```

## Key Features

✓ **Fresh context per attempt** — Each session starts clean but with accumulated lessons  
✓ **Automated testing** — Firmware round-trip validation (PASS/FAIL + byte diffs)  
✓ **Structured feedback** — Lessons auto-update templates and docs  
✓ **Reference models** — Compare against working examples (1chnl.bin, test.bin, bamf2)  
✓ **Full documentation** — Binary format, EdgeTX mapping, common pitfalls  
✓ **Iterative improvement** — Each attempt learns from the last  

## Commands

```bash
# Parse a model's structure
python3 lib/etx-parser.py models/<model>/<model>.etx

# Start reverse-engineering
./run.sh <model>

# Provide feedback after radio testing
./run.sh <model> --feedback

# View test results
cat models/<model>/attempt-N_test_report.json

# Compare byte-for-byte
hexdump -C models/<model>/attempt-1.bin | head -30

# Re-test an old attempt
node ../spike/test-model.js models/<model>/attempt-3.bin
```

## Expected Timeline

| Complexity | Attempts | Time Per | Total |
|-----------|----------|----------|-------|
| Minimal (1–2 features) | 1–2 | 30 min | 30–60 min |
| Simple (5–10) | 2–3 | 40 min | 80–120 min |
| Moderate (20+) | 3–5 | 50 min | 150–250 min |
| Complex (50+) | 5–8 | 60 min | 300–480 min |

Times improve as you learn the tools and patterns.

## Troubleshooting

**Setup issues?** → See `SETUP.md`  
**How does the workflow work?** → See `docs/workflow.md`  
**Binary format questions?** → See `skills/ethos-bin-format.md`  
**Model generation failed?** → Check `templates/mistakes-and-lessons.md`  
**Need code examples?** → See `templates/reference-models.md`

## Next Steps

1. **Check dependencies:** `./check-setup.sh`
2. **Read setup guide:** `SETUP.md`
3. **Place your model:** `mkdir -p models/<name>` then copy `.etx`
4. **Start:** `./run.sh <name>`
5. **Follow the prompt:** Claude will guide you

---

**Happy reverse-engineering! 🚀**

Questions? Check the docs above or review prior attempt logs in `models/<model>/`.
