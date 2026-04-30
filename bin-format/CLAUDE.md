# Binary Format Investigation Loop

## Goal

Reverse-engineer the Ethos `.bin` file format by comparing baseline vs changed binaries
after performing a specific UI action. Each investigation documents one field or block.

**One session = one investigation = one binary field.**

Output: `field-map.md` — living document mapping field names to offsets and encoding.

---

## Prerequisite

This project depends on **confirmed UI coordinates** from the ui-nav sub-project.
Before writing an investigation for a UI action, verify that the action's coordinates
are in `../skills/ethos-ui-navigation.md` (Confirmed Coordinates section).

If the action isn't confirmed yet — stop, go do the ui-nav probe first.

---

## Playwright infrastructure

All tests run from `../browser/`. Key files:

- `../browser/playwright.config.ts`
- `../browser/tests/helpers/navigate.ts` — `tapBitmap`, `touchBitmap`, nav helpers
- `../browser/tests/helpers/boot.ts` — `bootApp`, `navigateCreateModelWizard`
- `../browser/tests/helpers/diff.ts` — `downloadModelBin`, `saveBin`, `saveDiff`, `logDiff`
- `../browser/tests/investigate/` — existing investigation specs (reference)
- `../browser/findings/diffs/` — saved diff JSON files
- `../browser/findings/bins/` — saved baseline and changed bin files

---

## Running an investigation

```bash
cd /home/pete/Source/ethos/migrator/bin-format
./investigate.sh <name>
```

---

## Session workflow (one loop iteration)

1. **Read `field-map.md`** — identify what's already documented, pick the next field.

2. **Read the skills file** `../skills/ethos-ui-navigation.md` — find the confirmed
   coordinates for the UI action needed to change that field.

3. **Write an investigation spec** in `../browser/tests/investigate/<name>.spec.ts`:
   - Use the pattern from existing specs (see 11-flight-modes-add.spec.ts etc.)
   - Capture baseline BEFORE the action
   - Perform the action using confirmed coordinates from the skills file
   - Capture changed bin AFTER
   - Call `saveDiff(...)` and `logDiff(...)`

4. **Run**: `./investigate.sh <name>`

5. **Read the diff** from `../browser/findings/diffs/<name>.json`

6. **Analyse** — the diff JSON contains:
   - `changes`: array of `{ offset, baseline, changed }` byte-level changes
   - Each offset is decimal; convert with `printf '0x%04X\n' <offset>` for hex
   - Look for patterns: TLV encoding, length-prefixed strings, LE int16, etc.
   - ASCII string bytes: compare against expected ASCII codes

7. **Update `field-map.md`** with the finding. Format:
   ```markdown
   ## <Field Name>
   - **UI action**: <what was done>
   - **Offset**: 0xXXXX (decimal: NNN)
   - **Encoding**: <e.g. "length-prefixed ASCII string, max 16 bytes">
   - **Example**: `<baseline hex>` → `<changed hex>` (value: "" → "CRUISE")
   - **Notes**: <any TLV tags, surrounding structure, etc.>
   ```

8. **Stop.** Next session picks up from field-map.md.

---

## Known encoding patterns (from prior work)

The Ethos .bin file uses a TLV-like encoding:
- `0x82` prefix = 2-byte LE signed int16 follows
- `0x80`/`0x81` prefix = 1-byte value follows
- Strings appear as length byte + raw ASCII bytes (no null terminator observed yet)

### FM1 block structure (7 bytes, from investigation 11)

After adding FM1 (no name set), the 7-byte block is:
```
00 00 01 46 00 80 80
```
- Offset within block +3: character byte (0x46 = 'F' — the one char typed in investigation 12)
- The `01` before it is likely the string length byte
- Full name block appears to be: `<len:1> <chars:len>`

FM1 block starts at offset `0x0182` in the files examined (decimal 386).
Block: `00 00 <len> <char0..charN-1> 00 80 80`

---

## Field investigation queue

Priority order — each builds on the last:

1. **FM1 name: empty → "CRUISE"** (spec 12 — partially done, keyboard input broken)
   - Prereq: confirm keyboard touch-input works (ui-nav probe: keyboard-touch-vs-tap)
   - Expected: bytes at 0x0184 change from `00` to `06 43 52 55 49 53 45`

2. **FM1 switch**: assign a switch to FM1's activation condition
   - Prereq: confirm switch selector navigation (ui-nav)

3. **Mix: source field** — change source from Ail to Ele (spec 06 baseline)
   - Likely already investigated; check ../browser/findings/diffs/06-mixes-source.json

4. **Var: rate field** — change rate value (spec 04 baseline)
   - Likely already investigated; check ../browser/findings/diffs/04-vars-rate.json

---

## Quick hex tools

```bash
# Show hex diff of two bin files
xxd findings/bins/NAME-baseline.bin > /tmp/a.hex
xxd findings/bins/NAME.bin > /tmp/b.hex
diff /tmp/a.hex /tmp/b.hex

# Convert offset to hex
printf '0x%04X\n' 386

# Search for ASCII string in bin
grep -c "CRUISE" findings/bins/NAME.bin  # won't work — binary
python3 -c "
data = open('../browser/findings/bins/12-flight-modes-name.bin','rb').read()
needle = b'CRUISE'
idx = data.find(needle)
print(f'Found at offset {idx} (0x{idx:04X})' if idx >= 0 else 'Not found')
"
```
