# Primitive Migration — UI-Driven ETX → Ethos

This sub-project migrates EdgeTX model primitives into Ethos by driving the WASM
emulator UI with Playwright, one primitive per session.

## Layout

```
primitive-migration/
├── CLAUDE.md           this file
├── learn.sh            RALPH loop driver (one session per primitive)
└── sessions/
    └── <MODEL>/
        ├── accumulated.bin     running model state between sessions
        ├── var-0/
        │   └── session-1/
        │       ├── PROMPT.md
        │       ├── CLAUDE.md
        │       └── result.txt
        └── mix-0/
            └── session-1/
```

## Shared Resources (via ../)

| Path | Purpose |
|------|---------|
| `../skills/primitives/<type>.md` | Per-type mapping rules — updated after each session |
| `../skills/ethos-ui-navigation.md` | Confirmed UI coordinates |
| `../skills/wasm-browser-driver.md` | Playwright driver patterns |
| `../browser/` | Playwright infrastructure; specs written to `../browser/tests/primitives/` |
| `../lib/etx-extract-primitive.py` | Extracts a single primitive from an .etx container |

## Usage

```bash
cd primitive-migration

# List all primitives in a model
./learn.sh "models/20231128_BAMF2 Std/20231128.etx" "BAMF2 Std" --list

# Show session status for a model
./learn.sh "models/20231128_BAMF2 Std/20231128.etx" "BAMF2 Std" --status

# Run a session (headless)
./learn.sh "models/20231128_BAMF2 Std/20231128.etx" "BAMF2 Std" var 0

# Run a session with visible browser window
./learn.sh --headed "models/20231128_BAMF2 Std/20231128.etx" "BAMF2 Std" var 0
```

Container paths are relative to the migrator root (parent directory).

## What Each Session Does

1. Extracts the primitive data from the .etx
2. Loads current rules from `../skills/primitives/<type>.md`
3. Prepares a PROMPT.md and launches a fresh Claude session
4. Claude writes a Playwright spec, runs it, verifies via screenshot
5. Claude updates `../skills/primitives/<type>.md` with what was learned
6. Claude writes `result.txt`: `SUCCESS` or `LEARN: <notes>`
7. On SUCCESS: `accumulated.bin` is updated with the new model state

## After Each Session

The only file updated is `../skills/primitives/<type>.md`.
`accumulated.bin` is updated only on SUCCESS.
Retry the same primitive as many times as needed until SUCCESS, then move to the next.
