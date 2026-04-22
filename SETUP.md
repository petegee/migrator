# Setup and Dependencies

## What You Need

This project is **self-contained** — all firmware, tooling, and reference files are in the `migrator/` directory. You only need Node.js, Python 3, and Claude Code CLI installed on your system.

### Directory Structure

```
migrator/
├── lib/
│   ├── X18RS_FCC.wasm          # Firmware binary (23 MB)
│   ├── X18RS_FCC_patched.js    # Emscripten WASM wrapper
│   ├── test-model.js           # WASM testing harness
│   ├── wasm_radio.bin          # Radio settings (required by firmware)
│   ├── out.wat                 # Decompiled WASM source (143 MB, optional)
│   └── etx-parser.py           # EdgeTX .etx parser
├── reference-models/
│   ├── 1chnl.bin               # Minimal validated model
├── skills/                     # Format documentation
├── templates/                  # Prompt templates
└── models/                     # Your working models
```

## Setup Steps

### 1. Verify Spike Project Exists

```bash
ls lib/X18RS_FCC.wasm lib/test-model.js lib/X18RS_FCC_patched.js lib/wasm_radio.bin
# Should list 4 files
```

### 2. Verify Python 3 and YAML Support

```bash
python3 --version                    # Need 3.6+
python3 -c "import yaml; print(yaml.__version__)"  # Need PyYAML
```

If PyYAML is missing:
```bash
pip3 install pyyaml
```

### 3. Verify Node.js Available

```bash
node --version                       # Need 14+
```

Node.js is used by the WASM harness (`test-model.js`).

### 4. Verify Claude Code CLI

```bash
which claude-code
claude-code --version
```

Used to start new sessions for each model.

## Dependencies Explained

| Dependency | Location | Used For | Why? |
|------------|----------|----------|------|
| X18RS_FCC.wasm | `lib/` | WASM firmware | Self-contained local copy |
| out.wat | `lib/` | Decompiled firmware source | Human-readable WAT for debugging |
| X18RS_FCC_patched.js | `lib/` | WASM wrapper | Exposes firmware API |
| test-model.js | `lib/` | Testing harness | Validates generated .bin files |
| wasm_radio.bin | `lib/` | Firmware input | Pre-captured valid radio settings |
| Python 3 | system | Model parsing (etx-parser.py) | Parse EdgeTX YAML files |
| PyYAML | pip | YAML parsing | Read .etx files |
| Node.js | system | WASM harness | Run test-model.js |
| Claude Code CLI | system | Session management | Start new sessions |

## Quick Check: Is Everything Ready?

```bash
#!/bin/bash
cd ~/source/ethos/migrator

echo "Checking dependencies..."

# Spike project
[ -d ../spike ] && echo "✓ Spike project found" || echo "✗ Spike project missing"
[ -f lib/X18RS_FCC.wasm ] && echo "✓ WASM firmware found (local)" || echo "✗ WASM firmware missing (lib/X18RS_FCC.wasm)"
[ -f lib/out.wat ] && echo "✓ Decompiled WAT found (local)" || echo "⊘ out.wat not found (optional)"
[ -f lib/test-model.js ] && echo "✓ Test harness found" || echo "✗ Test harness missing"

# Python and YAML
python3 --version 2>&1 | head -1 && echo "✓ Python 3 found" || echo "✗ Python 3 missing"
python3 -c "import yaml" 2>&1 && echo "✓ PyYAML found" || echo "✗ PyYAML missing"

# Node.js
node --version 2>&1 | head -1 && echo "✓ Node.js found" || echo "✗ Node.js missing"

# Claude Code CLI
which claude-code &>/dev/null && echo "✓ Claude Code CLI found" || echo "✗ Claude Code CLI missing"

# This project
[ -x run.sh ] && echo "✓ run.sh executable" || echo "✗ run.sh not executable"
[ -f CLAUDE.md ] && echo "✓ CLAUDE.md found" || echo "✗ CLAUDE.md missing"
[ -d skills ] && echo "✓ Skills found" || echo "✗ Skills missing"
[ -d templates ] && echo "✓ Templates found" || echo "✗ Templates missing"
[ -d lib ] && echo "✓ Lib found" || echo "✗ Lib missing"

echo ""
echo "Done!"
```

Save as `check-setup.sh` and run:
```bash
chmod +x check-setup.sh
./check-setup.sh
```

## Troubleshooting Setup

### "lib/ files missing"

The `lib/` directory should contain all runtime files. If any are missing, check git history or restore from the original spike project at `~/source/ethos/spike/`.

### "PyYAML missing"

```bash
pip3 install pyyaml
```

Or with conda:
```bash
conda install -c conda-forge pyyaml
```

### "Claude Code CLI not found"

Install Claude Code (it's the CLI tool for this system):
```bash
# Installation depends on your OS
# See: https://github.com/anthropics/claude-code
```

### "Test harness fails: 'wasm_radio.bin not found'"

The `test-model.js` script looks for `wasm_radio.bin` in the same directory as itself (`lib/`). It should already be there. If it's missing:

```bash
ls lib/wasm_radio.bin
# If missing, it needs to be restored from spike or regenerated
```

## One-Time Setup

If everything checks out, you're ready:

```bash
cd ~/source/ethos/migrator

# Place your first model
mkdir -p models/bamf2
cp ~/path/to/bamf2.etx models/bamf2/

# Start reverse-engineering
./run.sh bamf2
```

## Maintenance

- **Keep spike updated** — If binary format docs change, they propagate automatically (via symlink)
- **Backup reference models** — The .bin files in spike are gold; don't delete
- **Update MEMORY.md** — As you learn from models, document lessons

## Versioning

This project assumes:
- Ethos firmware: **build 37** (1.6.x)
- WASM harness: matches spike project's X18RS_FCC.wasm
- Binary format: as documented in spike's skills files

If you use different firmware versions, you may need to adjust:
- Build number in generated .bin files
- Schema version byte (ck[1])
- Trim block count (varies by hardware)

---

Done! You're ready to start reverse-engineering.

Next: Read `CLAUDE.md` or run `./run.sh <model-name>`.
