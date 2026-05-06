# Flight Modes (flightModeData → Ethos Flight Modes) — Mapping Rules

ETX supports up to 9 flight modes (FM0–FM8). FM0 is always the fallback (no switch).
FM1–FM8 activate via a switch or logical switch; the first active one wins.

Ethos flight modes work the same way. Enter them in index order.

## Status

**Confirmed session-2 (2026-05-06):** FM1 name=LNCH1, Active condition=---, Fade in=0.0s, Fade out=0.0s.
**Confirmed FM2 session-1 (2026-05-06):** FM2 name=LNCH2, Active condition=---, Fade in=0.0s, Fade out=0.0s.
All coordinates and workflow below are confirmed working.

**FM editor field list (complete, no scroll needed):** Name · Active condition · Fade in · Fade out (4 fields only).
GVars and trim values from ETX are not present in the FM editor; they are handled separately.

## Dependency Ordering

Flight modes must be created **before** Vars and Mixes that reference them as conditions.
However, FM1/FM2 in BAMF2 use logical switches (L1, L3) as their activation condition.
Those logical switches do not yet exist when flight modes are first entered.

**Resolution:** Enter flight modes in two passes:
1. First pass — enter all FMs with their name only; leave condition as "---".
2. After logical switches are entered, return to FM1/FM2 and update their conditions.

## ETX → Ethos Field Mapping

| ETX field | Ethos FM field | Notes |
|---|---|---|
| `name` | Name | touch pencil icon (780,80) + keyboard; keyboard is CAPS LOCK (all uppercase) |
| `swtch` | Active condition | switch picker; leave as "---" if depends on unbuilt logical switch |
| `fadeIn` | Fade in | 0 = 0.0s default; no action needed if zero |
| `fadeOut` | Fade out | 0 = 0.0s default; no action needed if zero |
| `gvars` | (not in FM screen) | GVars are set in the GVars screen, not FM editor |
| `trim` | (not in FM screen) | Trim inheritance is automatic; not manually settable |

## Navigation Pitfall — Vars List Has No Bottom Nav

After navigating away from the Vars list, the bottom nav is NOT visible, so
`navigateToModelSetup()` (which taps 194,459) silently fails and leaves you on Vars.
`swipeCanvas(page, 'right')` from Model Setup Page 2 did NOT reliably reach Page 1.

**Confirmed fix:**
```typescript
await goBack(page);               // Vars list → Model Setup Page 2
await page.waitForTimeout(400);
await navigateHome(page);         // MS Page 2 has bottom nav → Home
await page.waitForTimeout(400);
await navigateToFlightModes(page); // Home → MS Page 1 → Flight Modes
```

## Screen Navigation

Model Setup (airplane icon, 194,459) → Flight Modes tile (500,140)

**From Vars list:** use goBack + navigateHome + navigateToFlightModes (see pitfall above).

## Confirmed Coordinates

| Action | Coords | Type |
|--------|--------|------|
| Flight Modes tile on Model Setup Page 1 | (500, 140) | tap |
| Add FM button (+ in header) | (569, 69) | tap |
| FM Name pencil icon | (780, 80) | touch |
| Keyboard CAPS — all letters auto-uppercase | row1 y=315, row2 y=340, row3 y=395 | touch |
| Switch to numbers (?123) | (40, 450) | touch |
| Number "1" key | (40, 315) | touch |
| Number "2" key | (120, 315) | touch | ✓ confirmed FM2 session-1 |
| Keyboard ENTER | (700, 450) | touch |
| Tap Active condition to commit name | (400, 128) | tap |
| Back arrow | (25, 25) | tap |

## FM Name Keyboard — CAPS LOCK Mode

The FM Name keyboard opens in CAPS LOCK (all-caps). Type directly — no Shift needed.
All output is uppercase regardless.

- ETX `name: Lnch1` → Ethos stores as `LNCH1` (keyboard enforces uppercase)
- Press ?123 at (40, 450) to access numbers keyboard
- "1" in numbers keyboard: (40, 315)
- ENTER at (700, 450) closes keyboard; name appears in editor
- After ENTER, tap Active condition row (400, 128) to commit the name field

## ETX Switch Reference

| ETX swtch value | Ethos condition |
|---|---|
| `NONE` | Always on (FM0 default) |
| `SG0` | SG switch position 0 (up) |
| `SG2` | SG switch position 2 (down) |
| `L1`–`L32` | Logical switch — must exist first; leave "---" until created |
| `!SA0` | Negated switch |

## Confirmed Recipe (FM1: name=LNCH1, condition=---)

```typescript
// Prerequisite: already navigated away from Vars list
await goBack(page);               // Vars list → Model Setup Page 2 (if coming from Vars)
await navigateHome(page);         // ensure bottom nav is available
await navigateToFlightModes(page); // → FM list

await tapBitmap(page, 569, 69);   // + header button → FM1 editor auto-opens
await page.waitForTimeout(800);

await touchBitmap(page, 780, 80); // Name pencil icon → keyboard
await page.waitForTimeout(700);

// Type "LNCH" (CAPS auto — all uppercase)
await touchBitmap(page, KEY.L[0], KEY.L[1]);
await touchBitmap(page, KEY.N[0], KEY.N[1]);
await touchBitmap(page, KEY.C[0], KEY.C[1]);
await touchBitmap(page, KEY.H[0], KEY.H[1]);

// Switch to numbers and type "1"
await touchBitmap(page, 40, 450); // ?123
await page.waitForTimeout(500);
await touchBitmap(page, 40, 315); // "1"
await page.waitForTimeout(200);

await touchBitmap(page, 700, 450); // ENTER — keyboard closes
await page.waitForTimeout(600);

// Commit name by tapping Active condition row
await tapBitmap(page, 400, 128);
await page.waitForTimeout(400);

// Active condition: leave as "---" (L1 doesn't exist yet)
// Fade in / Fade out: 0.0s by default — no action

await goBack(page); // FM editor → FM list
await goBack(page); // FM list → Model Setup
```

## Confirmed Recipe — Adding a Second FM (FM2: LNCH2) ✓ session-1 2026-05-06

After FM1 has been added and you're back at Model Setup Page 1:

```typescript
await navigateToFlightModes(page);  // MS Page 1 → Flight Modes list

await tapBitmap(page, 569, 69);     // + header → FM2 editor auto-opens
await page.waitForTimeout(800);

await touchBitmap(page, 780, 80);   // Name pencil icon → keyboard
await page.waitForTimeout(700);

// Type "LNCH"
await touchBitmap(page, KEY.L[0], KEY.L[1]);
await touchBitmap(page, KEY.N[0], KEY.N[1]);
await touchBitmap(page, KEY.C[0], KEY.C[1]);
await touchBitmap(page, KEY.H[0], KEY.H[1]);

// Switch to numbers and type "2"
await touchBitmap(page, 40, 450);   // ?123
await page.waitForTimeout(500);
await touchBitmap(page, 120, 315);  // "2" (80px right of "1")
await page.waitForTimeout(200);

await touchBitmap(page, 700, 450);  // ENTER — keyboard closes
await page.waitForTimeout(600);

await tapBitmap(page, 400, 128);    // commit name via Active condition tap
await page.waitForTimeout(400);

// Active condition: leave as "---" (L3 doesn't exist yet)
// Fade in / Fade out: 0.0s by default — no action

await goBack(page); // FM editor → FM list
await goBack(page); // FM list → Model Setup Page 1
```

**accumulated.bin delta:** 722 → 733 bytes (+11 bytes for FM2).
