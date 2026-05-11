# Primitive Migration Session — hvar-0 (ThmC: ch(8) Camber Var)

**Model:** BAMF2 Std
**Primitive:** hvar-0 (ETX "high mix" Var — not from expoData)
**Session:** 1
**Migrator root:** `/home/pete/Source/ethos/migrator`

---

## Goal

Two goals, in priority order:

**Goal A — Explore Var Actions UI (primary)**
Confirm how to add **Add** and **Divide** actions to an Ethos Var.
This is currently unconfirmed. Take screenshots of every step.
Update `../../../../../skills/primitives/var.md` with exact coordinates.

**Goal B — Create ThmC Var (once Actions UI is confirmed)**
Create the actual ThmC Var from the ETX ch(8) high-mix producers.
See "ETX source data" and "Planned Ethos design" below.

---

## Accumulated State

Path: `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin`
Status: EXISTS (794 bytes)

**Do NOT upload.** Due to a known upload slot bug, always use
`navigateCreateModelWizard(page)` to create a fresh model, then rebuild all
prior primitives before adding the new one.

The current accumulated.bin contains: Rudder var, Elevat var, Elev mix (mix-0), RSComp mix (mix-1).
Rebuild those in that order, then add the ThmC Var.

After a successful full run, download and overwrite `accumulated.bin`.

---

## ETX Source Data

ThmC is produced by two ETX "high mix" lines (destCh=8, consumed by RSComp/AilLCa/AilRCa):

```yaml
# mix-26: Therma
name: Therma
destCh: 8
mltpx: ADD
srcRaw: MAX
weight: GV4          # GV4 = 5% in all flight modes except CALIBR (GV4=0 there)
swtch: SG2            # Only active when thermal switch SG2 is thrown
flightModes: 0        # All flight modes

# mix-27: FineAd
name: FineAd
destCh: 8
mltpx: MUL
srcRaw: SLIDER2       # Right slider
weight: -80
offset: 80
swtch: NONE           # Always active
flightModes: 0
```

**ETX ch(8) math:**
FineAd (MUL) factor = `(SLIDER2 × −80/100) + 80` / 100

| SLIDER2 (Ethos convention: UP=−100) | Factor | ch(8) with GV4=5 |
|---|---|---|
| −100 (slider physically UP)  | (80+80)/100 = 1.6 | 5 × 1.6 = **8%** |
| 0 (slider center)            | (0+80)/100  = 0.8 | 5 × 0.8 = **4%** |
| +100 (slider physically DOWN)| (−80+80)/100 = 0  | 5 × 0   = **0%** |

So: **slider UP = maximum camber (8%), slider DOWN = zero camber**.

**Note:** This is the OPPOSITE of what was documented in the earlier session (which assumed
slider UP = 0). The correct direction per the ETX FineAd formula is slider UP = max.
This needs to be verified physically on the radio — the slider hardware may be inverted on
this model, making the effective direction different.

---

## Planned Ethos Var Design (ThmC)

```
Name:    ThmC
Comment: ThmC

Values row:
  Source = Right Slider (SLIDER2)
  Condition = SG2 (thermal switch — matches Therma's swtch)

Actions (to be explored this session):
  Action 1: Add −100  (Always on)
    Effect: slider −100 → −200, slider +100 → 0
  OR
  Action 1: Add 100  (Always on)
    Effect: slider −100 → 0, slider +100 → 200

  Depending on which Action 1 we use:
  Action 2: Divide by N  (Always on)
    N = ? → see target output below

Target output:
  We want the Var to produce 0–8% matching the ETX ch(8) behavior.
  If "slider UP = max" is correct (matches ETX):
    - At slider −100: output = 8 (max camber)
    - At slider +100: output = 0 (no camber)
    For this: Add −100 → range −200..0, Negate, Divide by 25 → range 0..8
    OR:  Invert then Add 100 + Divide by 25
  If user preference is "slider DOWN = max":
    - At slider +100: output = 8 (max camber)
    - At slider −100: output = 0 (no camber)
    For this: Add 100 → range 0..200, Divide by 25 → range 0..8

  N = 25 in either case (200 / 8 = 25), assuming GV4=5 → max = 8%.

  **For this session: implement "slider DOWN = max" (the user's stated preference)
  using Add 100 + Divide by 25. If the physical slider direction produces
  backwards behavior on the radio, the sign can be corrected later.**
```

---

## Rebuild Sequence

This session must rebuild the complete model from scratch before adding ThmC:

1. `navigateCreateModelWizard(page)` → accept wizard defaults
2. Navigate to Vars → create **Rudder var** (src=Rudder, name/comment="Rudder")
3. Create **Elevat var** (src=Elevator, name/comment="Elevat")
4. Navigate to Mixes → create **Elev mix** (name=Elev, src=Elevat var, weight=100%)
5. Create **RSComp mix** (name=RSComp, src=CH8, weight=25%)
6. Create **ThmC Var** (new — see below)
7. Download and overwrite accumulated.bin

Steps 1–5 are already confirmed (see `mix-1-session-9.spec.ts` for working code).
Copy those blocks from the session-9 spec.

---

## ThmC Var — What to Confirm This Session

### Already confirmed in var.md:
- Creating a Var: `tapBitmap(563, 69)` (list header +)
- Setting Name via keyboard
- Setting analog source via long-hold on Values row
- Setting Comment via keyboard

### Not yet confirmed (explore carefully with screenshots):

**1. Setting "Right Slider" as analog source**
The analog picker has Members: Rudder, Elevator, Throttle, Aileron, Pot1, ...
Right Slider likely appears further down. Need to scroll or find it.
- After tapping "Analogs" in category list, scroll the member sub-list to find "Right Slider"
- Screenshot after each scroll to document positions

**2. Setting a switch condition on a Value row**
Therma uses `swtch=SG2`. In Ethos, this should be a condition on the Var value row.
Currently undocumented. Explore: long-hold or tap the Values row after setting source.
Is there a way to add a condition? Or does the condition go on the Var itself?

**3. Adding Actions to a Var**
This is the main unknown. Look for:
- A dedicated "Actions" section below Values in the Var editor
- A "+ Add action" row or button
- Possible entry via hamburger menu (⋮) or a long-hold somewhere

Take screenshots to map the full Var editor layout (scroll down if needed).

**4. Action types available**
Once you find Actions, check what types are available:
- Add (constant offset)
- Multiply / Divide
- Others?

**5. Action value entry**
How to set the value for Add (e.g., +100) and Divide (e.g., ÷25):
- Is it a numeric picker? A spinner?
- Confirm the control bar appears and document coords.

---

## Playwright Infrastructure

Browser dir: `/home/pete/Source/ethos/migrator/browser/`

Helpers (import with path relative to your spec in `tests/primitives/`):
- `../helpers/boot` — `bootApp(page)`, `navigateCreateModelWizard(page)`
- `../helpers/navigate` — `tapBitmap(page,x,y)`, `touchBitmap(page,x,y)`, `swipeCanvas(page,'left'|'right')`, `goBack(page)`, `navigateToMixes(page)`
- `../helpers/upload` — `uploadFile(page, 'model', path)` (not used — rebuild only)
- `../helpers/download` — `downloadToBuffer(download)`, `clickDownloadMenuItem(page, MENU.modelFile)`

Reference spec (copy rebuild blocks from):
  `/home/pete/Source/ethos/migrator/browser/tests/primitives/mix-1-session-9.spec.ts`

Write your spec to:
  `/home/pete/Source/ethos/migrator/browser/tests/primitives/hvar-0-session-1.spec.ts`

Run it with:
```bash
cd /home/pete/Source/ethos/migrator/browser
npx playwright test tests/primitives/hvar-0-session-1.spec.ts --reporter=list --project=chromium
```

Screenshots land in `/home/pete/Source/ethos/migrator/test-results/hvar-0-session-1/`.

Emulator URL: https://ethos.studio1247.com/1.6.6/X18RS_FCC

---

## Key Navigation Facts

- Canvas bitmap space: 800×480
- Most nav (menus, back arrow, list rows): `tapBitmap`
- Keyboard keys, Mixes/Vars context menu items: `touchBitmap`
- Bottom nav → Model Setup: `tapBitmap(page, 194, 459)`
- Page 2 of Model Setup (Vars tile): swipe left → `tapBitmap(page, 300, 330)`
- Back arrow: `tapBitmap(page, 25, 25)` or `goBack(page)`

---

## Workflow

1. **Read** this prompt and `../../../../../skills/primitives/var.md`
2. **Write** spec `hvar-0-session-1.spec.ts` with:
   - Full rebuild (wizard → Rudder var → Elevat var → Elev mix → RSComp mix)
   - Attempt to create ThmC Var with all fields + Actions
   - Dense snapshots around every unknown step
3. **Run** the spec
4. **Read** screenshots — document exactly what the Var editor shows
5. **Update** `../../../../../skills/primitives/var.md` with everything learned about:
   - Right Slider analog selection
   - Switch condition on Var value row
   - Actions section (Add/Divide) — exact steps and coordinates
6. **Write** `result.txt`:
   - `SUCCESS` — ThmC Var created with correct source, condition, Add+Divide actions
   - `LEARN: <notes>` — if any part failed; document what was found

---

## Output Files (mandatory before ending)

| File | Content |
|------|---------|
| `result.txt` (this directory) | SUCCESS or LEARN: notes |
| `../../../../../skills/primitives/var.md` | Updated with Actions UI and Right Slider steps |
| `../../../../../primitive-migration/sessions/BAMF2_Std/accumulated.bin` | Updated model .bin (only on SUCCESS) |
