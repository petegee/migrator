# Setup and Dependencies

## What You Need

This project depends on files and tools from the spike project at `~/source/ethos/spike/`.

### Directory Structure

```
~/source/ethos/
├── spike/                          # Parent project (required)
│   ├── skills/                     # Skills documentation
│   ├── X18RS_FCC.wasm              # Firmware binary
│   ├── X18RS_FCC_patched.js        # WASM wrapper
│   ├── test-model.js               # Testing harness
│   ├── wasm_radio.bin              # Reference radio settings
│   ├── 1chnl.bin                   # Reference models
│   ├── test.bin
│   └── ...
│
└── migrator/                       # This project (you are here)
    ├── skills/                     # Symlinked from spike
    ├── run.sh
    ├── lib/
    ├── templates/
    └── models/
```

## Setup Steps

### 1. Verify Spike Project Exists

```bash
ls -d ~/source/ethos/spike/
# Should show: spike/

ls ~/source/ethos/spike/{X18RS_FCC.wasm,X18RS_FCC_patched.js,test-model.js}
# Should list 3 files
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
| X18RS_FCC.wasm | `../spike/` | WASM firmware | Required by test harness |
| X18RS_FCC_patched.js | `../spike/` | WASM wrapper | Exposes firmware API |
| test-model.js | `../spike/` | Testing harness | Validates generated .bin files |
| wasm_radio.bin | `../spike/` | Firmware input | Pre-captured valid radio settings |
| skills/ | `../spike/skills/` | Documentation | Binary format reference + patterns |
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
[ -f ../spike/X18RS_FCC.wasm ] && echo "✓ WASM firmware found" || echo "✗ WASM firmware missing"
[ -f ../spike/test-model.js ] && echo "✓ Test harness found" || echo "✗ Test harness missing"

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

### "Spike project not found"

Make sure you've built the spike project first:
```bash
cd ~/source/ethos/spike
# (populate with X18RS_FCC.wasm, etc.)
```

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

The `test-model.js` script expects `wasm_radio.bin` in the spike directory. If missing:

```bash
# Generate it (run once)
cd ~/source/ethos/spike
node run-patched.js
# This will create wasm_radio.bin
```

Or copy a known-good one:
```bash
cp ~/source/ethos/spike/wasm_radio.bin ~/source/ethos/migrator/
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
