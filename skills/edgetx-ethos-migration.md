# EdgeTX / OpenTX Model Understanding Skill

You are an expert in EdgeTX/OpenTX RC transmitter model configurations. You deeply understand the EdgeTX signal processing pipeline and can write code to parse, simulate, and validate models.

For Ethos model format details, refer to the `ethos.md` skill file (reverse-engineered from the Ethos WASM simulator).
For migration from EdgeTX/OpenTX to Ethos, refer to the dedicated migration skill file.

---

## 0. Key Primitive Differences and Migration Patterns

### What to Convert vs. Skip

**Convert these:**
- Inputs (expoData) → Vars (1:1)
- Mixes (mixData) → Free Mixes
- Logical switches → Logical switches
- Curves → Curves
- Special functions → Special functions

**Skip these entirely — do not attempt conversion:**
- Timers
- Telemetry
- Lua scripts
- RF settings
- Checklists
- Trainer settings

---

### Inputs → Vars

Each EdgeTX input (`expoData` entry) maps 1:1 to an Ethos **Var**. A Var represents a normalized input signal (stick, switch, pot, etc.) and acts as the input-layer abstraction.

Input rates (dual rates, expo) are expressed inside the Var by adding an **action** that sets the rate value conditionally based on a switch or logical switch. There is no separate "rate" concept in Ethos — it lives inside the Var definition.

OpenTX/EdgeTX trims are applied **upstream** (input stage). Ethos applies trims **at the output stage**. Therefore, input-stage trims from EdgeTX must be converted into **Var-level offsets** to preserve functional behavior.

---

### Mixes → Free Mixes

**Critical rule: use only Free Mixes. Never use Ethos built-in specialized mixers (CCPM, vtail, elevon, etc.).**

| EdgeTX | Ethos |
|---|---|
| Mix line targets a single `destCh` | Free Mix can target N output channels |
| Multiple stacked mix lines per channel (ADD/MULT/REPL) | Multiple Free Mixes piped to one output channel (same stacking semantics) |
| Mix = source + weight + offset + switch + curve | Free Mix = same primitives, same evaluation order |

The stacking of mix lines in EdgeTX (where lines for the same `destCh` accumulate via ADD/MULT/REPL) is replicated in Ethos by having multiple Free Mixes feed the same output channel in sequence.

---

### Overall Conversion Strategy

The conversion produces a **complete Ethos Free Mix network** using only Vars and Free Mixes:

1. **Flatten** all mixer structures into a canonical weighted signal graph before emission.
2. **Compile** conditional logic and switches into Var-dependent weighting functions.
3. **Preserve functional behavior** (signal values, switch logic, rates) — not structural similarity to the source model.
4. Each output channel is defined as a deterministic combination of Vars and intermediate signals.

The result: every channel's output value is a function of Vars (inputs) and Free Mix weights, with no dependency on Ethos-specific built-in mixer types.

---

## 1. EdgeTX Model File Format

An `.etx` file is a **ZIP archive** containing:
```
RADIO/radio.yml      # transmitter hardware calibration and global settings
MODELS/model00.yml   # model config files (00–99)
MODELS/model01.yml
...
```

Extract with any ZIP tool or Python's `zipfile` module.

### `radio.yml` key fields
```yaml
semver: 2.9.2          # EdgeTX firmware version
board: x9d+2019        # hardware model
calib:
  Rud/Ele/Thr/Ail/POT1/POT2/SLIDER1/SLIDER2:
    mid: <int>         # ADC midpoint raw value
    spanNeg: <int>     # ADC span below mid
    spanPos: <int>     # ADC span above mid
currModelFilename: model12.yml
```

### `model.yml` top-level sections (in order)
| Section | Description |
|---|---|
| `header` | Model name, bitmap, labels, modelId |
| `timers` | Up to 3 timers with switch, mode, countdown settings |
| `flightModeData` | 9 flight modes (FM0–FM8), trims, GVARs, switch, fade |
| `mixData` | All mixer lines (the core signal path) |
| `limitData` | Output/channel endpoints (servo calibration) |
| `expoData` | Input definitions (dual-rates, expo, curves) |
| `curves` | Custom curve definitions |
| `points` | Y-values for all custom curves (flat array, sequential) |
| `logicalSw` | Logical switch definitions (L1–L32) |
| `customFn` | Special functions (audio, haptic, variable overrides) |
| `gvars` | Global variable metadata (names, units, min/max, precision) |

---

## 2. Signal Processing Pipeline

### Canonical data flow
```
Physical Controls (sticks/switches/pots)
        ↓  [calibration applied in radio.yml]
   Sources  (Ail, Ele, Thr, Rud, SA-SJ, POT1-3, SLIDER1-2, MAX, MIN, ch(n), gv(n), tele(n), ls(n), I[n])
        ↓
   expoData (Inputs) — rate/expo/curve per flight mode
        ↓
   mixData  (Mixes)  — combine sources onto destCh with weight/offset/curve/operator
        ↓
   limitData (Outputs) — clip ±100%, apply ppmCenter/min/max/revert/curve → PWM µs
        ↓
   RF Transmission
```

### Stage 1: Sources

Raw stick values normalised to **−1024 to +1024** internally (displayed as −100% to +100%). Special sources:
- `MAX` = constant +1024 (use weight −100% for MIN)
- `ch(n)` = another channel's mixer output (cascading, unclipped)
- `gv(n)` = global variable value (integer, mode-specific)
- `tele(n)` = telemetry sensor value
- `ls(n)` = logical switch (true=+1024, false=−1024 or 0 depending on usage)
- `I[n]` = input line n (output of expoData stage)
- `TrimAil/TrimEle/TrimThr/TrimRud` = trim positions

### Stage 2: expoData (Inputs)

Each `expoData` entry maps a source to a named input channel (`chn` = 0-based channel index):

```yaml
expoData:
  - srcRaw: Ail          # source
    chn: 0               # input channel index
    mode: 3              # 1=positive half, 2=negative half, 3=both
    weight: 80           # rate as % (-500 to +500)
    offset: 0            # added after weight, in %
    curve:
      type: 0            # 0=diff, 1=expo, 2=func, 3=custom curve index
      value: 20          # expo %, diff %, func type, or curve index
    swtch: NONE          # activating switch (NONE = always)
    flightModes: 000000000  # 9-char string, '1'=disabled for FM[i]
    trimSource: 0        # 0=use model trim, non-zero=specific trim
    name: AilLow
```

**Evaluation:**
1. If `swtch` is set and not active → skip this line
2. If current flight mode bit in `flightModes` is '1' → skip this line
3. If `mode` is 1: only apply to positive side; if 2: negative side; 3: both
4. `output = apply_curve(srcRaw_value * weight/100 + offset, curve)`
5. Multiple lines for the same `chn` with different switches implement dual/triple rates — only one will be active based on switch state

**Curve types in expoData:**
- `type=0, value=N`: Differential — reduces one side by N%
- `type=1, value=N`: Expo — standard exponential response, N% expo
- `type=2, value=N`: Function (0=linear, 1=x>0, 2=x<0, 3=|x|, 4=f>0, 5=f<0, 6=|f|)
- `type=3, value=N`: Custom curve index N from the `curves` section

### Stage 3: mixData (Mixes)

Each mix line contributes one source to one destination channel:

```yaml
mixData:
  - destCh: 0            # destination channel (0-based)
    srcRaw: I3           # source reference
    weight: 100          # % weight (-500 to +500), can be GV reference e.g. GV1
    offset: -1           # % offset added after weighting
    curve:
      type: 0
      value: GV1         # weight/offset/curve.value CAN be "GV1"–"GV9"
    mltpx: ADD           # ADD | MULT | REPL
    flightModes: 010001111  # '1'=disabled, '0'=enabled for FM[i]
    swtch: NONE          # activating switch
    carryTrim: 1         # 1=include trim in source value
    delayUp: 0           # seconds delay on increasing value (×0.1s if 1 decimal)
    delayDown: 0
    speedUp: 0           # seconds for full-range slew (0=instant)
    speedDown: 0
    mixWarn: 0           # beep pattern when active (0=none, 1-3=beep count)
    name: AILL
```

**Evaluation for channel destCh:**
```
channel_value = 0
for each mix line targeting destCh, in order:
    if swtch not active → skip
    if current FM bit in flightModes is '1' → skip
    source = resolve_source(srcRaw, carryTrim)
    contribution = apply_curve(source * weight/100 + offset, curve)
    if mltpx == ADD:  channel_value += contribution
    if mltpx == MULT: channel_value *= contribution / 100
    if mltpx == REPL: channel_value  = contribution
```

**GV references:** When `weight` or `offset` is a string like `"GV1"`, resolve it from `flightModeData[current_fm].gvars[0].val` (GV1=index 0, GV9=index 8).

**Flight mode string:** `flightModes: "010001111"` — character index 0 = FM0, index 8 = FM8. `'1'` = **disabled** in that mode, `'0'` = enabled.

### Stage 4: limitData (Outputs)

Each channel index has a `limitData` entry:

```yaml
limitData:
  3:
    min: -128           # lower endpoint adjustment (-1000 to 0, in 0.1% units from −100%)
    max: 50             # upper endpoint adjustment (0 to +1000)
    revert: 1           # 0=normal, 1=invert output
    offset: 0           # subtrim (in 0.1% units, max 100 = 10%)
    ppmCenter: -200     # deviation from 1500µs center (in µs × 0.1)
    symetrical: 1       # 1=symmetric limits mode
    name: Ele
    curve: 0            # 0=none, else 1-based curve index
```

**PWM conversion:**
```python
def to_pwm(channel_value, limit):
    # channel_value: -1024 to +1024 (clipped from mix stage)
    v = channel_value
    if limit['revert']:
        v = -v
    v = v + limit['offset'] * 10.24      # subtrim offset
    # apply min/max endpoints
    # ppmCenter shifts entire range: center_us = 1500 + ppmCenter
    center = 1500 + limit['ppmCenter']
    # at +1024: pulse = center + 512 * (max+1000)/1000
    # at -1024: pulse = center - 512 * (min+1000)/1000  (min is stored negative)
    if v >= 0:
        pwm = center + (v / 1024) * 512 * (1000 + limit['max']) / 1000
    else:
        pwm = center + (v / 1024) * 512 * (1000 - limit['min']) / 1000
    return int(pwm)  # µs, typical range 988–2012
```

Note: `min` is stored as a negative deviation (e.g. `min: -500` = reduces lower end by 50%). `max` is stored as a positive deviation.

### Flight Mode Resolution

```python
def active_flight_mode(flight_mode_data, switch_values):
    # FM0 is always the fallback
    # Check FM1–FM8 in order, return first whose swtch is active
    for i in range(1, 9):
        fm = flight_mode_data.get(i)
        if fm and fm.get('swtch') and is_switch_active(fm['swtch'], switch_values):
            return i
    return 0
```

Trim mode values in `flightModeData[n].trim[i].mode`:
- `0`: own trim value
- `2*k` (even, k≥1): use FM(k) trim, bidirectionally linked
- `2*k+1` (odd): use FM(k) trim value but changes don't propagate back
- `31`: disabled (no trim)

---

## 3. Logical Switches (logicalSw)

Referenced as `L1`–`L32` (1-indexed in YAML keys 0–31).

```yaml
logicalSw:
  0:                    # = L1
    func: FUNC_VNEG     # function type
    def: "Thr,70"       # comma-separated args
    delay: 0            # × 0.1 seconds
    duration: 0         # × 0.1 seconds (how long stays true after trigger)
    andsw: NONE         # AND switch — must also be true
```

**Function types and `def` format:**

| func | def format | meaning |
|---|---|---|
| `FUNC_VEQUAL` | `src,val` | src == val |
| `FUNC_VPOS` | `src,val` | src > val |
| `FUNC_VNEG` | `src,val` | src < val |
| `FUNC_APOS` | `src,val` | \|src\| > val |
| `FUNC_ANEG` | `src,val` | \|src\| < val |
| `FUNC_AND` | `sw1,sw2` | sw1 AND sw2 |
| `FUNC_OR` | `sw1,sw2` | sw1 OR sw2 |
| `FUNC_XOR` | `sw1,sw2` | sw1 XOR sw2 |
| `FUNC_EDGE` | `sw,t1,t2` | edge detection |
| `FUNC_EQUAL` | `src,src2` | src == src2 |
| `FUNC_GREATER` | `src,src2` | src > src2 |
| `FUNC_LESS` | `src,src2` | src < src2 |
| `FUNC_STICKY` | `set_sw,reset_sw` | SR latch |
| `FUNC_TIMER` | `on_t,period` | periodic timer |

Switch references in `def`: `SWx0/SWx1/SWx2` for positions up/mid/down; prefix `!` to negate; `FM0`–`FM8` for flight modes as switches; `L1`–`L32` to reference other logical switches.

---

## 4. Curves

```yaml
curves:
  0:
    type: 0     # 0 = Y-only (x points evenly distributed), 1 = X+Y pairs
    smooth: 1   # 0 = linear interpolation, 1 = cubic spline
    points: 2   # extra points beyond base 5: actual count = 5 + points
    name: flp
points:         # flat array of all curve Y values across all curves in order
  0:
    val: -96
  1:
    val: -68
  ...
```

The `points` top-level section stores Y values for all curves sequentially. Curve 0 with `points: 2` uses 7 values (5+2), curve 1 follows immediately after.

For `type: 1` (X+Y), each point stores both an x and y value as pairs.

---

## 5. Python Simulation Harness

```python
"""EdgeTX model signal processing simulator."""
import zipfile
import yaml
from typing import Dict, Any

def load_etx(path: str) -> Dict[str, Any]:
    with zipfile.ZipFile(path) as z:
        models = {}
        with z.open('RADIO/radio.yml') as f:
            radio = yaml.safe_load(f)
        for name in z.namelist():
            if name.startswith('MODELS/'):
                with z.open(name) as f:
                    models[name] = yaml.safe_load(f)
    return {'radio': radio, 'models': models}

class EdgeTXSimulator:
    def __init__(self, model: Dict):
        self.model = model
        self.flight_mode = 0
        self.switch_states: Dict[str, bool] = {}
        self.gvars = self._load_gvars()

    def _load_gvars(self) -> Dict[int, Dict[int, int]]:
        """gvars[fm_index][gv_index] = value"""
        result = {}
        for fm_idx, fm in (self.model.get('flightModeData') or {}).items():
            result[int(fm_idx)] = {}
            for gv_idx, gv in (fm.get('gvars') or {}).items():
                result[int(fm_idx)][int(gv_idx)] = gv.get('val', 0)
        return result

    def set_flight_mode(self, fm: int):
        self.flight_mode = fm

    def set_switch(self, name: str, active: bool):
        self.switch_states[name] = active

    def resolve_gvar(self, ref: str) -> float:
        """Resolve 'GV1'–'GV9' to current FM value."""
        if isinstance(ref, str) and ref.startswith('GV'):
            idx = int(ref[2:]) - 1
            return self.gvars.get(self.flight_mode, {}).get(idx, 0)
        return float(ref)

    def is_switch_active(self, swtch: str) -> bool:
        if swtch in (None, 'NONE', ''):
            return True
        negated = swtch.startswith('!')
        name = swtch.lstrip('!')
        if name.startswith('FM'):
            fm_num = int(name[2:])
            result = (self.flight_mode == fm_num)
        else:
            result = self.switch_states.get(name, False)
        return (not result) if negated else result

    def fm_enabled(self, fm_string: str) -> bool:
        """Return True if current FM is enabled (bit is '0') in the 9-char string."""
        if not fm_string or len(fm_string) < 9:
            return True
        return fm_string[self.flight_mode] == '0'

    def apply_expo_curve(self, value: float, curve_type: int, curve_value) -> float:
        cv = self.resolve_gvar(curve_value)
        if curve_type == 0:  # differential
            if value > 0:
                return value * (100 - cv) / 100
            else:
                return value * (100 + cv) / 100
        elif curve_type == 1:  # expo
            # standard RC expo formula
            e = cv / 100.0
            x = value / 1024.0
            result = x * (e * x * x + (1 - e))
            return result * 1024
        elif curve_type == 2:  # func
            funcs = {
                0: lambda x: x,
                1: lambda x: max(0, x),
                2: lambda x: min(0, x),
                3: lambda x: abs(x),
                4: lambda x: 1024 if x > 0 else -1024,
                5: lambda x: -1024 if x > 0 else 1024,
                6: lambda x: 1024 if x != 0 else 0,
            }
            return funcs.get(int(cv), lambda x: x)(value)
        else:  # custom curve — look up index
            return self._apply_custom_curve(value, int(cv))

    def _apply_custom_curve(self, value: float, curve_idx: int) -> float:
        curves = self.model.get('curves') or {}
        all_points = self.model.get('points') or {}
        offset = 0
        for i in range(curve_idx):
            c = curves.get(i, {})
            n_extra = c.get('points', 0)
            n_pts = 5 + n_extra
            if curves.get(i, {}).get('type', 0) == 1:
                n_pts *= 2  # x+y pairs
            offset += n_pts
        c = curves.get(curve_idx, {})
        n_extra = c.get('points', 0)
        n_pts = 5 + n_extra
        y_vals = [all_points.get(offset + j, {}).get('val', 0) for j in range(n_pts)]
        # linearly interpolate
        x = value / 1024.0  # -1 to +1
        step = 2.0 / (n_pts - 1)
        pos = (x + 1.0) / step
        i = int(pos)
        i = max(0, min(i, n_pts - 2))
        t = pos - i
        result = y_vals[i] * (1 - t) + y_vals[i + 1] * t
        return result / 100.0 * 1024

    def compute_inputs(self, raw_sources: Dict[str, float]) -> Dict[int, float]:
        """Apply expoData to raw sources, return input channel values."""
        inputs: Dict[int, float] = {}
        for entry in (self.model.get('expoData') or []):
            chn = entry.get('chn', 0)
            if not self.is_switch_active(entry.get('swtch', 'NONE')):
                continue
            if not self.fm_enabled(entry.get('flightModes', '000000000')):
                continue
            src_name = entry.get('srcRaw', 'NONE')
            src_val = raw_sources.get(src_name, 0.0)
            mode = entry.get('mode', 3)
            if mode == 1 and src_val < 0:
                continue
            if mode == 2 and src_val > 0:
                continue
            weight = self.resolve_gvar(entry.get('weight', 100))
            offset = self.resolve_gvar(entry.get('offset', 0))
            curve = entry.get('curve', {})
            val = src_val * weight / 100.0 + offset * 10.24
            val = self.apply_expo_curve(val, curve.get('type', 0), curve.get('value', 0))
            inputs[chn] = val  # last matching line wins (dual rates)
        return inputs

    def compute_mixes(self, raw_sources: Dict[str, float],
                      inputs: Dict[int, float]) -> Dict[int, float]:
        """Run mixData to produce channel values (unclipped)."""
        channels: Dict[int, float] = {}
        def get_source(src_name: str) -> float:
            if src_name.startswith('I'):
                return inputs.get(int(src_name[1:]) - 1, 0.0)
            if src_name.startswith('ch('):
                ch_idx = int(src_name[3:-1]) - 1
                return channels.get(ch_idx, 0.0)
            return raw_sources.get(src_name, 0.0)

        for mix in (self.model.get('mixData') or []):
            dest = mix.get('destCh', 0)
            if not self.is_switch_active(mix.get('swtch', 'NONE')):
                continue
            if not self.fm_enabled(mix.get('flightModes', '000000000')):
                continue
            src_val = get_source(mix.get('srcRaw', 'NONE'))
            weight = self.resolve_gvar(mix.get('weight', 100))
            offset = self.resolve_gvar(mix.get('offset', 0))
            curve = mix.get('curve', {})
            val = src_val * weight / 100.0 + offset * 10.24
            val = self.apply_expo_curve(val, curve.get('type', 0), curve.get('value', 0))
            op = mix.get('mltpx', 'ADD')
            prev = channels.get(dest, 0.0)
            if op == 'ADD':
                channels[dest] = prev + val
            elif op == 'MULT':
                channels[dest] = prev * val / 1024.0
            elif op == 'REPL':
                channels[dest] = val
        return channels

    def compute_outputs(self, channels: Dict[int, float]) -> Dict[int, int]:
        """Apply limitData to produce PWM values in µs."""
        pwm = {}
        limits = self.model.get('limitData') or {}
        for ch_idx, value in channels.items():
            # clip to ±1024
            value = max(-1024, min(1024, value))
            limit = limits.get(ch_idx, {})
            if limit.get('revert', 0):
                value = -value
            offset = limit.get('offset', 0) * 10.24
            value += offset
            center = 1500 + limit.get('ppmCenter', 0)
            max_adj = limit.get('max', 0)   # positive, 0–1000
            min_adj = limit.get('min', 0)   # negative, −1000–0
            if value >= 0:
                us = center + (value / 1024) * 512 * (1000 + max_adj) / 1000
            else:
                us = center + (value / 1024) * 512 * (1000 - min_adj) / 1000
            pwm[ch_idx] = int(round(us))
        return pwm

    def simulate(self, raw_sources: Dict[str, float]) -> Dict[str, Any]:
        """Full pipeline: sources → inputs → mixes → outputs."""
        inputs = self.compute_inputs(raw_sources)
        channels = self.compute_mixes(raw_sources, inputs)
        pwm = self.compute_outputs(channels)
        return {'inputs': inputs, 'channels': channels, 'pwm': pwm}
```

---

## 6. Writing Tests / Validation Harness

```python
"""Validation harness for comparing EdgeTX and Ethos model behaviour."""

def assert_channel_approx(sim_result, ch_index, expected_pct, tolerance_pct=2.0):
    """Check channel output is within tolerance of expected percentage."""
    # expected_pct: -100 to +100
    expected_us = 1500 + expected_pct * 5.12  # rough conversion
    actual_us = sim_result['pwm'].get(ch_index, 1500)
    assert abs(actual_us - expected_us) <= tolerance_pct * 5.12, \
        f"CH{ch_index+1}: expected {expected_pct}% ({expected_us:.0f}µs) got {actual_us}µs"

# Example test: full aileron right, elevator neutral, FM0
def test_aileron_right(sim: EdgeTXSimulator):
    result = sim.simulate({
        'Ail': 1024,   # full right
        'Ele': 0,
        'Thr': -1024,
        'Rud': 0,
    })
    # CH1 should be near +100% aileron travel
    assert_channel_approx(result, 0, 100, tolerance_pct=5)
    return result

# Sweep test: move one stick through range and record outputs
def sweep_test(sim: EdgeTXSimulator, source: str,
               steps=21, fm=0) -> list:
    sim.set_flight_mode(fm)
    results = []
    for i in range(steps):
        val = -1024 + (2048 * i // (steps - 1))
        sources = {'Ail': 0, 'Ele': 0, 'Thr': -1024, 'Rud': 0}
        sources[source] = val
        r = sim.simulate(sources)
        results.append({'input': val / 10.24, 'pwm': dict(r['pwm'])})
    return results

# Flight mode comparison test
def compare_flight_modes(sim: EdgeTXSimulator, sources: dict) -> dict:
    results = {}
    for fm in range(9):
        sim.set_flight_mode(fm)
        results[f'FM{fm}'] = sim.simulate(sources)
    return results
```

---

## 7. Key Gotchas

1. **Flight mode bit string**: index 0 = FM0, `'1'` = **disabled**. Easy to invert this.
2. **GV indexing**: `GV1` = `gvars[0]`, i.e. 1-indexed in name, 0-indexed in array.
3. **limitData min is negative**: `min: -500` means −50% limit reduction, not an absolute value.
4. **ppmCenter** is in µs deviation from 1500, stored as-is in YAML.
5. **Cascaded channels**: `ch(n)` sources in mixData are **not clipped** — only limitData clips.
6. **Logical switch 0-indexed**: YAML key `0:` = L1 in the UI, `1:` = L2, etc.
7. **expoData mode field**: `mode: 3` = both sides (normal), `mode: 1` = positive half only, `mode: 2` = negative half only. Use this to implement per-side rate curves.
8. **Curve points**: `curves.N.points: K` means the curve has `5+K` Y values. The flat `points:` array contains all curves' data sequentially.
9. **Trim mode `mode: 31`**: disabled trim — do not inherit from any FM.
10. **`symetrical: 0`** in limitData: asymmetric limits mode — the min and max limits are independent.
