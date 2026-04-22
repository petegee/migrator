# Migrator Workflow — Step-by-Step Guide

## Overview

The migrator automates reverse-engineering of EdgeTX models (.etx) into Ethos binary format (.bin). Each model is a fresh Claude Code session with templated guidance, test automation, and feedback collection.

**Cycle time:** ~30–60 min per attempt (generation + firmware test)

---

## Quick Start

### 1. Add a Model

Place your EdgeTX .etx file in the models directory:

```bash
mkdir -p models/bamf2
cp ~/path/to/bamf2.etx models/bamf2/
```

### 2. Start Reverse-Engineering

```bash
cd ~/source/ethos/migrator
./run.sh bamf2
```

The script will:
- Parse the .etx structure
- Display the prompt Claude will see
- Start a Claude Code session

### 3. Claude Generates and Tests

In the Claude session, Claude will:
1. Analyze the source structure
2. Write Python/C# code to generate the .bin file
3. Test it: `! node lib/test-model.js bamf2_attempt_1.bin`
4. Review the test report (JSON + diff + validation)
5. Fix issues if needed
6. Report results

### 4. Download and Test on Radio

Once Claude's test passes:
1. Download `bamf2_attempt_1.bin` from the session
2. Copy to your radio's model directory
3. Load it in Ethos and set as active model
4. Test: do inputs work? Do mixes work? Any errors?

### 5. Provide Feedback

```bash
./run.sh bamf2 --feedback
```

Interactive prompts ask:
- Did it load on the radio?
- Any errors?
- Which sections worked?
- What should we fix?

Answers are saved and auto-update:
- `templates/mistakes-and-lessons.md`
- `skills/ethos-bin-format.md`
- `skills/edgetx-ethos-migration.md`

### 6. Repeat

```bash
./run.sh bamf2
```

Next attempt starts fresh but with lessons from prior iterations.

---

## Detailed Workflow

### Phase 1: Preparation

**Time: ~5 minutes**

```bash
cd ~/source/ethos/migrator

# Verify the source .etx exists
ls -lh models/<model>/<model>.etx

# Review its structure
python3 lib/etx-parser.py models/<model>/<model>.etx

# Output shows: inputs, mixes, flight modes, trims, etc.
```

### Phase 2: Claude Session (Reverse-Engineering)

**Time: ~30–45 minutes**

```bash
./run.sh <model>
```

What happens:
1. Script parses .etx file
2. Fills in prompt template with model-specific data
3. Shows you the prompt
4. Starts Claude Code session

**In the Claude session, you (or Claude in batch mode) will:**

1. **Analyze** the source structure (shown in prompt)
2. **Design** the binary layout (sections, offsets)
3. **Implement** the generator (Python or C#):
   ```python
   def generate_ethos_bin(model_name, inputs, mixes, ...):
       content = build_content(...)      # assemble sections
       crc = crc16_ccitt(content)         # compute CRC
       header = build_frsk_header(crc)    # 16-byte header
       return header + content
   ```
4. **Test** immediately:
   ```bash
   ! node lib/test-model.js <model>_attempt_1.bin
   ```
5. **Analyze** the test report:
   - Check `*_test_report.json` → status field
   - Check `*_diff.txt` → byte changes (should be 0)
   - Check `*_validation.txt` → Python validator output
6. **Fix** issues if needed:
   - If FAIL: check error message, fix code, regenerate
   - If PASS with diffs: firmware normalized (acceptable, but investigate why)
   - If PASS with 0 diffs: perfect! Ready for radio test
7. **Report** findings:
   - What worked
   - What was surprising
   - Recommendations for next attempt

### Phase 3: Radio Testing

**Time: ~10–20 minutes**

Outside Claude, on your transmitter:

1. Download the `.bin` file from the Claude session
2. Copy to radio model directory
3. Load model in Ethos UI
4. Set as active model
5. Test:
   - Can you move sticks? (inputs working?)
   - Do control surfaces respond? (mixes working?)
   - Are trims responding?
   - Any error messages in UI?
   - Any beeps or warnings?

### Phase 4: Feedback

**Time: ~5 minutes**

```bash
./run.sh <model> --feedback
```

Interactive script asks:

```
Did the model load on the radio? (yes/no)
> yes

Any errors in the UI or control responses? (describe)
> Aileron input was inverted, fixed by reversing the input

Which sections worked? (inputs/mixes/trims/outputs - comma separated, or 'all')
> inputs, mixes, trims

What should we fix? (brief notes)
> Input direction was backward; otherwise solid
```

Your feedback is saved to:
- `models/<model>/attempt-N_feedback.txt`

And auto-updates the lessons file:
- `templates/mistakes-and-lessons.md`

### Phase 5: Next Iteration

```bash
./run.sh <model>
```

New session starts (attempt N+1) with:
- Fresh Claude context
- Lessons from prior attempts baked into the prompt
- Reference to your feedback
- Same working directory and files

**Repeat Phases 2–5** until the model is perfect.

---

## Example Timeline: Reverse-Engineering bamf2

### Attempt 1

```bash
# 09:00 — Prep
./run.sh bamf2
# Shows prompt, starts session

# 09:05–09:35 — Claude session
# Claude generates attempt-1.bin, tests it
# Test result: PASS, diffCount=0, validates OK
# Report: "Model structure looks good"

# 09:35–09:50 — Radio test
# Download attempt-1.bin to radio
# Load model, test sticks/mixes
# Result: Inputs are inverted, everything else OK

# 09:50 — Feedback
./run.sh bamf2 --feedback
# Response: "Loaded OK, inputs inverted, fix input direction"
# Feedback saved, lessons updated
```

### Attempt 2

```bash
# 10:00 — Next iteration
./run.sh bamf2
# Prompt now includes feedback: "Prior attempt had inverted inputs"

# 10:05–10:25 — Claude session
# Claude sees feedback, adjusts input encoding
# Regenerates attempt-2.bin
# Test: PASS, diffCount=0

# 10:25–10:40 — Radio test
# Download attempt-2.bin
# Load, test sticks/mixes
# Result: All working, no errors!

# 10:40 — Feedback
./run.sh bamf2 --feedback
# Response: "Perfect, all working"
# Feedback saved, model marked as complete
```

**Total time: ~1.5 hours for 2 iterations.**

---

## File Structure After Workflow

After several attempts, your directory looks like:

```
models/
├── bamf2/
│   ├── bamf2.etx                    # Original source
│   ├── attempt-1.bin
│   ├── attempt-1_test_report.json
│   ├── attempt-1_diff.txt
│   ├── attempt-1_validation.txt
│   ├── attempt-1_feedback.txt
│   ├── attempt-2.bin
│   ├── attempt-2_test_report.json
│   ├── attempt-2_feedback.txt
│   └── ...
```

Each attempt is fully documented:
- **Binary file**: the generated model
- **Test report**: JSON with status, diffs, validation
- **Diff file**: byte-for-byte changes (if any)
- **Validation file**: Python structure analysis
- **Feedback file**: radio test results + notes

---

## Useful Commands

### Check Status of All Attempts

```bash
for att in models/<model>/attempt-*/; do
  echo "=== $(basename $att) ==="
  jq '.status, .reason' "$att"_test_report.json
done
```

### Compare Two Attempts

```bash
hexdump -C models/<model>/attempt-1.bin > /tmp/att1.hex
hexdump -C models/<model>/attempt-2.bin > /tmp/att2.hex
diff /tmp/att1.hex /tmp/att2.hex | head -30
```

### View Radio Feedback History

```bash
grep -h "Loaded\|errors\|working" models/<model>/attempt-*_feedback.txt
```

### Re-test an Old Attempt

```bash
node lib/test-model.js models/<model>/attempt-3.bin
```

---

## Troubleshooting

### "My model isn't generating correctly"

1. Check the parsed structure:
   ```bash
   python3 lib/etx-parser.py models/<model>/<model>.etx
   ```

2. Compare the prompt Claude received (shown in `./run.sh` output)

3. Review the skills files:
   - `skills/ethos-bin-format.md` — format spec
   - `templates/mistakes-and-lessons.md` — known pitfalls

4. Use reference models for comparison:
   - `reference-models/1chnl.bin` — minimal structure

### "Test harness says FAIL"

1. Check the validation output:
   ```bash
   cat models/<model>/attempt-N_validation.txt
   ```

2. Look for errors like:
   - CRC mismatch
   - Wrong file length
   - Bad magic bytes
   - Sentinel errors

3. Review the Python validator hints (in validation.txt)

4. Compare byte-for-byte against a working reference:
   ```bash
   python3 -c "
   import sys
   a = open('models/<model>/attempt-N.bin', 'rb').read()
   b = open('reference-models/1chnl.bin', 'rb').read()
   for i in range(min(len(a), len(b))):
       if a[i] != b[i]:
           print(f'Diff at 0x{i:04x}: {a[i]:02x} vs {b[i]:02x}')
           if i > 0x30:  # stop after 30 bytes
               break
   "
   ```

### "Model doesn't load on radio"

1. Check the test report first — if firmware test didn't pass, radio won't either
2. Download the correct `.bin` file (not a test report!)
3. Verify file size is reasonable (> 100 bytes)
4. Try a reference model on the radio first (should work)
5. Provide feedback: `./run.sh <model> --feedback` with error details

---

## Advanced: Batch Processing

If using Claude API in batch mode:

```bash
# (Future enhancement)
# Would allow automated iteration without manual feedback
```

For now, each attempt is manual:
1. Claude generates
2. You test on radio
3. You provide feedback
4. Claude regenerates

---

## Best Practices

1. **Use reference models** — Keep 1chnl.bin and shinto.bin nearby
2. **Document findings** — Use feedback to improve the prompt
3. **Test early and often** — Don't wait until the end to validate
4. **Compare against references** — Byte-for-byte comparisons reveal structure
5. **Build incrementally** — Start minimal, add features
6. **Keep feedback specific** — "Input inverted" is better than "doesn't work"
7. **Update skills files** — New discoveries should go into the reference docs

---

## Timeline Expectations

| Model Complexity | Typical Attempts | Time Per Attempt | Total Time |
|------------------|------------------|------------------|------------|
| Minimal (1–2 features) | 1–2 | 30 min | 30–60 min |
| Simple (5–10 features) | 2–3 | 40 min | 80–120 min |
| Moderate (20+ features) | 3–5 | 50 min | 150–250 min |
| Complex (50+ features) | 5–8 | 60 min | 300–480 min |

Times improve as you learn the format and tools.

---

## Next Steps

1. **Place your first model:** `models/<model>/<model>.etx`
2. **Start the workflow:** `./run.sh <model>`
3. **Follow the prompt:** Claude will guide you
4. **Test on radio:** After each attempt
5. **Provide feedback:** `./run.sh <model> --feedback`
6. **Iterate:** Each attempt builds on the last
