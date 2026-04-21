# Quick Start — 5 Minutes to Your First Reverse-Engineering Session

## 1. Verify Setup (30 seconds)

```bash
cd ~/source/ethos/migrator
./check-setup.sh
```

**Expected output:** "All checks passed!"

## 2. Place Your Model Container (1 minute)

```bash
# Copy your EdgeTX .etx file (ZIP container) to models/
# .etx is a ZIP with multiple model YAML files inside
cp ~/path/to/bamf2.etx models/

# Verify it's there
ls models/bamf2.etx
```

## 3. Start the Reverse-Engineering Session (2 minutes)

```bash
# Arguments: <container.etx> <model-name-inside>
./run.sh models/bamf2.etx bamf2
```

**Note:** The first argument is the .etx container file.  
The second argument is the model name inside the container.

**What you'll see:**
1. Model structure will be parsed and displayed
2. A prompt will be shown (this is what Claude will see)
3. A Claude Code session will start

**What Claude will do:**
1. Analyze the source model structure
2. Generate a `.bin` file
3. Test it against the WASM firmware
4. Report results: PASS/FAIL + byte diffs
5. Fix issues if needed

## 4. Download and Test on Radio (10–15 minutes)

Once Claude's test passes:

1. **Download the binary file** from the Claude session
   - Look for: `attempt-1.bin` or similar
   - Should be ~500–2000 bytes

2. **Copy to your radio** and load as a model

3. **Test the model:**
   - Can you move the sticks? (inputs working?)
   - Do control surfaces respond? (mixes working?)
   - Do trims work?
   - Any error messages?

## 5. Provide Feedback (1 minute, optional)

If you want to improve the next attempt:

```bash
./run.sh models/bamf2.etx bamf2 --feedback
```

**You'll be asked:**
- Did the model load on the radio? (yes/no)
- Any errors?
- Which sections worked?
- What should we fix?

Your answers will improve the next attempt.

## 6. Iterate (Repeat step 3–5)

If something didn't work:

```bash
./run.sh models/bamf2.etx bamf2
```

New session starts with lessons from the prior attempt.

---

## That's It!

**Total time for one attempt:** 30–60 minutes  
**Complexity:** Minimal — just follow the prompts

### Next Steps

- **Want details?** Read `docs/workflow.md`
- **Having issues?** Check `SETUP.md` for troubleshooting
- **Need examples?** See `templates/reference-models.md`
- **Binary format questions?** See `skills/ethos-bin-format.md`

---

## Common Questions

**Q: What's the difference between the container name and model name?**  
A: `.etx` is a ZIP container with multiple model YAML files. You pass both:
  - Container: `models/bamf2.etx` (the ZIP file)
  - Model: `bamf2` (the model name inside the ZIP)

**Q: Where's my generated .bin file?**  
A: It will appear in the Claude session. Download it. The working directory is shown when you run the script.

**Q: What if the firmware test fails?**  
A: Claude will show you the error. Check `templates/mistakes-and-lessons.md` for common issues.

**Q: Can I run multiple models in parallel?**  
A: Yes! Each `./run.sh <container> <model>` starts a new independent session.

**Q: Will subsequent attempts improve?**  
A: Yes! Each attempt includes lessons from prior feedback.

---

Good luck! 🚀
