# Changes: Two-Argument Workflow

## Summary

Updated the migrator to correctly handle .etx files as **ZIP containers** with multiple models inside. The workflow now requires **two arguments**:

1. **Container filename** — `models/bamf2.etx` (the ZIP container)
2. **Model name** — `bamf2` (the specific model inside the container)

## What Changed

### Script Arguments

**Before:**
```bash
./run.sh <model-name>
./run.sh bamf2
```

**After:**
```bash
./run.sh <container.etx> <model-name>
./run.sh models/bamf2.etx bamf2
```

### Files Modified

| File | Changes |
|------|---------|
| `run.sh` | Now accepts 2 arguments; extracts model from ZIP container; creates working directories as `models/<container>_<model>` |
| `lib/etx-parser.py` | Now accepts 2 arguments; opens .etx as ZIP; extracts and parses specified model's YAML file |
| `templates/reverse-engineer.md` | Updated prompt to show both container and model names |
| `QUICKSTART.md` | Updated examples and Q&A to reflect two-argument workflow |

### New Functionality

**ZIP Container Handling:**
- `run.sh` no longer looks for `models/<model>/<model>.etx`
- Instead, you place: `models/bamf2.etx` (the ZIP container)
- Script extracts the model YAML from inside the ZIP
- Works with any model YAML file inside the container

**etx-parser.py Enhanced:**
```python
extract_model_from_etx(etx_path, model_name)
  # Opens .etx as ZIP
  # Looks for model_name.yml, models/model_name.yml, etc.
  # Returns parsed YAML data
  # Lists available models if not found
```

**Working Directory Structure:**
```
models/
├── bamf2.etx                    # ZIP container (you place this)
├── bamf2_bamf2/                 # Working directory (script creates)
│   ├── attempt-1.bin
│   ├── attempt-1_test_report.json
│   └── attempt-1_feedback.txt
└── [other-container]_[model]/
    └── ...
```

## Usage Examples

### Extract and parse a model from .etx

```bash
# See what's inside a container
python3 lib/etx-parser.py models/bamf2.etx bamf2
```

Output shows the model's structure (inputs, mixes, etc.)

### Start reverse-engineering

```bash
./run.sh models/bamf2.etx bamf2
```

Script will:
1. Extract `bamf2.yml` from `models/bamf2.etx` (ZIP)
2. Parse its structure
3. Create working directory: `models/bamf2_bamf2/`
4. Start Claude session for attempt-1

### Multiple models from same container

If your .etx contains `model1.yml` and `model2.yml`:

```bash
./run.sh models/my-container.etx model1
./run.sh models/my-container.etx model2
```

Each creates its own working directory:
- `models/my-container_model1/`
- `models/my-container_model2/`

## Error Handling

If a model is not found in the container:

```
ERROR: Model 'nonexistent' not found in models/bamf2.etx
Available models: ['bamf2.yml', 'backup.yml']
```

Script lists available models to help you choose the right one.

## Backward Compatibility

This is a **breaking change** — the old single-argument workflow no longer works. You must provide both container and model names.

---

**Status:** Ready to use  
**Date:** 2026-04-21
