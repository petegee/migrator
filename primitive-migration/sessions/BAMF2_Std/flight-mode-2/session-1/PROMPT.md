# Primitive Migration Session

**Model:** BAMF2 Std
**Container:** /home/pete/Source/ethos/migrator/models/20231128_BAMF2 Std/20231128.etx
**Primitive:** flight-mode-2
**Session:** 1
**Migrator root:** /home/pete/Source/ethos/migrator

---

## Goal

Enter exactly ONE primitive from this EdgeTX model into the Ethos WASM emulator UI
by driving Playwright. The firmware serialises correctly — no binary work needed.

Do NOT modify any other primitives. Load the accumulated state, add this one
primitive, save the result.

---

## Accumulated State

Path: `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin`
Status: EXISTS (722 bytes) — upload this before editing

If it EXISTS: upload it via the Upload button before making any changes.
If it does NOT exist: call `navigateCreateModelWizard(page)` to start fresh.

After successfully entering the primitive, download the model .bin and write it to
`/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` using `fs.writeFileSync`.

---

## ETX Primitive Data

```yaml
data:
  fadeIn: 0
  fadeOut: 0
  gvars:
    6:
      val: 0
    7:
      val: 0
    8:
      val: 0
  name: Lnch2
  swtch: L3
  trim:
    0:
      mode: 4
      value: 0
    1:
      mode: 4
      value: -4
    2:
      mode: 4
      value: 252
    3:
      mode: 4
      value: 0
index: 2
total_count: 9
type: flight-mode
```

---

## Current Mapping Rules for type: flight-mode

```
(no rules yet — this is the first session for type 'flight-mode')
```

---

## Playwright Infrastructure

Browser dir: `/home/pete/Source/ethos/migrator/browser/`

Helpers (import with path relative to your spec in `tests/primitives/`):
- `../helpers/boot` — `bootApp(page)`, `navigateCreateModelWizard(page)`
- `../helpers/navigate` — `tapBitmap(page,x,y)`, `touchBitmap(page,x,y)`, `swipeCanvas(page,'left'|'right')`
- `../helpers/upload` — `uploadFile(page, 'model', path)`
- `../helpers/download` — `downloadToBuffer(download)`, `clickDownloadMenuItem(page, MENU.modelFile)`

Write your spec to:
  `/home/pete/Source/ethos/migrator/browser/tests/primitives/flight-mode-2-session-1.spec.ts`

Run it with:
```bash
cd /home/pete/Source/ethos/migrator/browser
npx playwright test tests/primitives/flight-mode-2-session-1.spec.ts --reporter=list --project=chromium
```


Screenshots and traces land in `/home/pete/Source/ethos/migrator/browser/test-results/`.

Emulator URL: https://ethos.studio1247.com/1.6.6/X18RS_FCC

---

## Key Navigation Facts

(from confirmed coordinates in `/home/pete/Source/ethos/migrator/skills/ethos-ui-navigation.md`)

- Canvas bitmap space: 800×480
- Most nav (menus, back arrow, list rows): `tapBitmap`
- Keyboard keys, Mixes/Vars context menu items: `touchBitmap`
- Bottom nav → Model Setup: `tapBitmap(page, 194, 459)`
- Page 2 of Model Setup (Vars/Curves/Logic switches/SF): swipe left from page 1
- Back arrow: `tapBitmap(page, 25, 25)`
- After entering all fields: `clickDownloadMenuItem(page, MENU.modelFile)` then save

---

## Workflow

1. **Read** the primitive data and current rules
2. **Write** the Playwright spec at `/home/pete/Source/ethos/migrator/browser/tests/primitives/flight-mode-2-session-1.spec.ts`
   - Boot the emulator (`bootApp`)
   - Upload accumulated.bin if it exists, or run wizard if not
   - Navigate to the right screen for this primitive type
   - Enter all field values from the ETX data
   - Take a screenshot to verify each field
   - Download the model .bin and write it to `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin`
3. **Run** the spec
4. **Read** screenshots from test-results — confirm fields are correct
5. **Update** `/home/pete/Source/ethos/migrator/skills/primitives/flight-mode.md` with confirmed steps or failure notes
6. **Write** `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/flight-mode-2/session-1/result.txt`:
   - `SUCCESS` — primitive entered and screenshot confirms it
   - `LEARN: <what to change next session>` — something failed

---

## Output Files (mandatory before ending)

| File | Content |
|------|---------|
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/flight-mode-2/session-1/result.txt` | SUCCESS or LEARN: notes |
| `/home/pete/Source/ethos/migrator/skills/primitives/flight-mode.md` | Updated mapping rules for type 'flight-mode' |
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` | Updated model .bin (only on SUCCESS) |
