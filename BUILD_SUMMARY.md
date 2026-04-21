# Migrator Project — Build Summary

**Status:** ✓ Complete and ready to use

**Date Built:** 2026-04-21  
**Time:** ~1 hour  
**Files Created:** 13 files + 2 symlinks

---

## What Was Built

A complete **automated reverse-engineering workflow** for converting EdgeTX model files (.etx YAML) to Ethos binary format (.bin). The system is designed to:

1. **Start fresh each attempt** with a new Claude Code session
2. **Use templated prompts** that include model-specific data
3. **Auto-test against firmware** using the WASM harness
4. **Collect feedback** from radio testing
5. **Update templates and docs** with lessons learned
6. **Iterate** until the model is perfect

---

## Files & Purpose

### Entry Points

| File | Purpose |
|------|---------|
| `README.md` | Main documentation + project overview |
| `QUICKSTART.md` | 5-minute quick start guide |
| `check-setup.sh` | Verify dependencies are installed |
| `run.sh` | Main workflow script: `./run.sh <model>` or `./run.sh <model> --feedback` |

### Documentation

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context, goals, directory structure, workflow overview |
| `SETUP.md` | Dependencies, installation, troubleshooting |
| `docs/workflow.md` | Detailed step-by-step workflow with timeline examples |

### Utilities

| File | Purpose |
|------|---------|
| `lib/etx-parser.py` | Parse EdgeTX .etx YAML files → extract model structure |

### Templates (Auto-Updated)

| File | Purpose |
|------|---------|
| `templates/reverse-engineer.md` | Main prompt template (filled per-model with structure) |
| `templates/mistakes-and-lessons.md` | Common pitfalls & solutions (auto-updated from feedback) |
| `templates/reference-models.md` | Catalog of working examples (1chnl.bin, test.bin, etc.) |

### Skills (Symlinked from spike)

| File | Purpose |
|------|---------|
| `skills/ethos-bin-format.md` | Complete Ethos binary format reference (from spike) |
| `skills/edgetx-ethos-migration.md` | EdgeTX → Ethos concepts mapping (from spike) |

### Directories

| Directory | Purpose |
|-----------|---------|
| `models/` | Your models (one per subdirectory) |
| `sessions/` | (Optional) Store Claude session transcripts |

---

## Key Features Implemented

✓ **Setup verification** — `check-setup.sh` ensures all dependencies  
✓ **Model parsing** — `etx-parser.py` extracts structure from .etx YAML  
✓ **Workflow automation** — `run.sh` handles templating + session startup  
✓ **Structured templates** — Prompt, mistakes-and-lessons, reference models  
✓ **Comprehensive docs** — QUICKSTART, SETUP, detailed workflow  
✓ **Feedback collection** — Interactive feedback script updates prompts  
✓ **Integration with spike** — Symlinked skills, reuses WASM harness  

---

## How to Use

### First Time

```bash
cd ~/source/ethos/migrator

# 1. Check setup (should pass)
./check-setup.sh

# 2. Read quick start
cat QUICKSTART.md

# 3. Place your model
cp ~/path/to/model.etx models/model/
```

### For Each Model

```bash
# Start reverse-engineering
./run.sh model

# After Claude completes:
# - Download the .bin file
# - Test on radio
# - Provide feedback
./run.sh model --feedback

# Next iteration (repeats with lessons from prior attempt)
./run.sh model
```

---

## Integration with Spike Project

The migrator reuses:
- **`skills/`** — Symlinked to spike/skills/ (ethos-bin-format.md, edgetx-ethos-migration.md)
- **`test-model.js`** — Firmware testing harness at ../spike/test-model.js
- **`X18RS_FCC.wasm`** — Firmware binary at ../spike/X18RS_FCC.wasm
- **`wasm_radio.bin`** — Reference radio settings at ../spike/wasm_radio.bin
- **Reference models** — 1chnl.bin, test.bin, etc. at ../spike/

All skills and tools are auto-updated if you modify the spike project.

---

## Project Structure

```
~/source/ethos/migrator/
├── README.md                       ← Start here
├── QUICKSTART.md                   ← 5-minute guide
├── SETUP.md                        ← Dependencies
├── CLAUDE.md                       ← Project context
├── BUILD_SUMMARY.md                ← This file
│
├── check-setup.sh                  ← Verify setup
├── run.sh                          ← Main workflow (./run.sh <model>)
│
├── skills/                         ← Symlinked from spike/skills/
│   ├── ethos-bin-format.md        ← Binary format reference
│   └── edgetx-ethos-migration.md  ← Mapping guide
│
├── lib/                            ← Utilities
│   └── etx-parser.py              ← Parse .etx YAML files
│
├── templates/                      ← Prompts and reference docs
│   ├── reverse-engineer.md        ← Main prompt (auto-filled per-model)
│   ├── mistakes-and-lessons.md    ← Common pitfalls (auto-updated)
│   └── reference-models.md        ← Working examples
│
├── docs/                           ← Full documentation
│   └── workflow.md                ← Detailed step-by-step guide
│
├── models/                         ← Your models (create subdirs)
│   └── [model-name]/
│       ├── [model].etx             ← Source (you provide)
│       ├── attempt-1.bin           ← Generated
│       ├── attempt-1_test_report.json
│       ├── attempt-1_feedback.txt
│       └── ...
│
└── sessions/                       ← (Optional) Claude transcripts
```

---

## Workflow at a Glance

```
User: ./run.sh bamf2
       │
       ├─ Parse bamf2.etx
       ├─ Fill prompt template
       └─ Start Claude Code session
           │
           ├─ Claude generates attempt-1.bin
           ├─ Tests: ! node ../spike/test-model.js
           ├─ Result: PASS (or fix + retry)
           └─ Saves: attempt-1_test_report.json
                     attempt-1_diff.txt
                     attempt-1_validation.txt

User: Download attempt-1.bin, test on radio
       │
       └─ Feedback: ./run.sh bamf2 --feedback
           │
           ├─ Collect: "Inputs inverted"
           ├─ Save: attempt-1_feedback.txt
           └─ Update: templates/mistakes-and-lessons.md

User: ./run.sh bamf2
       │
       └─ New session starts (attempt 2)
           │
           ├─ Claude reads feedback from attempt 1
           ├─ Generates attempt-2.bin with fixes
           ├─ Tests and reports
           └─ Repeat...
```

---

## Dependencies Verified

✓ Spike project (WASM firmware, test harness, skills)  
✓ Python 3 + PyYAML (model parsing)  
✓ Node.js (WASM harness)  
✓ Claude CLI (`claude` command)  

All checked by `check-setup.sh`.

---

## What's Ready to Use

The system is **fully functional** and ready to reverse-engineer your first model. No additional setup needed.

### To Start

```bash
cd ~/source/ethos/migrator
cat QUICKSTART.md     # Read the quick start
./run.sh <model>     # Replace <model> with your model name
```

---

## Design Highlights

### 1. Fresh Context Per Attempt

Each session:
- Starts with a clean Claude context
- Includes the templated prompt (pre-filled with model-specific data)
- Has access to lessons from prior attempts
- Can be interrupted/resumed as needed

**Benefit:** No context bloat; each attempt is focused.

### 2. Structured Feedback

After radio testing:
- Interactive prompts ask specific questions
- Answers are saved to a feedback file
- Auto-updates templates for next attempt

**Benefit:** Lessons are captured and reused.

### 3. Reference Models

Working examples available:
- `1chnl.bin` — minimal (527 bytes)
- `test.bin` — moderate (693 bytes)
- `bamf2_4mix_2Bnames.bin` — real model (865 bytes)

**Benefit:** You can compare and debug against known-good files.

### 4. Automated Testing

After generation:
- Test harness runs immediately
- Produces: JSON report, byte diff, Python validation
- Status is clear: PASS/FAIL + reasons

**Benefit:** Validate early; fail fast; iterate quickly.

---

## Next Steps

1. **Read:** `QUICKSTART.md` (5 minutes)
2. **Verify:** `./check-setup.sh` (30 seconds)
3. **Place model:** Copy your .etx file to `models/<model>/`
4. **Start:** `./run.sh <model>` (kicks off Claude session)
5. **Follow prompts:** Claude will guide you through generation and testing
6. **Test on radio:** Download the .bin file and load it
7. **Iterate:** `./run.sh <model> --feedback` → `./run.sh <model>` (repeat until perfect)

---

## FAQ

**Q: Can I use this for multiple models?**  
A: Yes! Just create a new subdirectory in `models/` for each model.

**Q: Will each attempt learn from prior feedback?**  
A: Yes! Feedback is captured and the next attempt's prompt includes it.

**Q: What if firmware test fails?**  
A: Claude will analyze the error. Check `templates/mistakes-and-lessons.md` for common issues.

**Q: How long does each attempt take?**  
A: 30–60 minutes depending on model complexity.

**Q: Can I run attempts in parallel?**  
A: Yes! Each `./run.sh <model>` is independent. Run multiple sessions for different models.

---

**Status: ✓ Ready to use**

Place your first model and run `./run.sh <model>` to get started! 🚀
