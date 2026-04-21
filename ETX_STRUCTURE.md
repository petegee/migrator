# .etx Container Structure

## What is an .etx file?

An `.etx` file is a **ZIP container** used by EdgeTX/OpenTX to store model configurations. It contains:

- **RADIO/radio.yml** — Global radio settings
- **MODELS/model00.yml**, **MODELS/model01.yml**, etc. — Individual model configurations

## Finding Your Model

The actual **model name** is NOT the filename. It's stored inside the YAML file under the `header.name` field.

### Example

Container: `20231128.etx` contains:
- `MODELS/model00.yml` → Model named "PlusX"
- `MODELS/model01.yml` → Model named "MaxaPro4m"
- `MODELS/model10.yml` → Model named "BAMF2 Std"

To reverse-engineer "BAMF2 Std":

```bash
./run.sh models/20231128.etx "BAMF2 Std"
```

The script will:
1. Extract all MODELS/modelXX.yml files from the ZIP
2. Parse each YAML's `header.name` field
3. Find the one matching "BAMF2 Std"
4. Work with that model

## Listing Available Models

If you don't know what models are in a container, try an incorrect name:

```bash
./run.sh models/20231128.etx InvalidModel
```

Output shows:
```
ERROR: Model 'InvalidModel' not found in models/20231128.etx
Available models: ['PlusX', 'MaxaPro4m', 'Plus', 'BAMF2 Std', 'BAMF2 Strong', ...]
```

## EdgeTX YAML Structure

Model YAMLs contain:

```yaml
semver: 2.8.5
header:
  name: BAMF2 Std              # ← Actual model name
  bitmap: ""
  labels: ""
mixData:
  0:
    name: "AILL"
    destCh: 0
    lines: [...]
expoData:
  0:
    name: "Ailero"
    chn: 0
    lines: [...]
flightModeData:
  0:
    name: "Normal"
    trim: {...}
limitData:
  0:
    name: "Elev"
    ...
```

Fields are **dictionaries with numeric keys** (0, 1, 2...), not arrays.

