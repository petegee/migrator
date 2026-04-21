#!/usr/bin/env python3
"""
Parse EdgeTX .etx (ZIP container) model and extract structure summary.
Usage: python3 lib/etx-parser.py <etx-file> <model-name>

The .etx file is a ZIP containing multiple model YAML files.
"""
import sys
import yaml
import zipfile
from pathlib import Path
from io import BytesIO

def format_value(val, depth=0):
    """Pretty-print a value."""
    if isinstance(val, dict):
        if not val:
            return '{}'
        items = '\n'.join(f"  {'  '*depth}{k}: {format_value(v, depth+1)}" for k, v in list(val.items())[:5])
        if len(val) > 5:
            items += f"\n  {'  '*depth}... and {len(val)-5} more"
        return '{\n' + items + '\n' + '  '*(depth-1) + '}'
    elif isinstance(val, list):
        if not val:
            return '[]'
        return f'[{len(val)} items]'
    elif isinstance(val, str) and len(val) > 60:
        return f'"{val[:60]}..."'
    elif isinstance(val, float):
        return f'{val:.1f}'
    else:
        return repr(val)

def extract_model_from_etx(etx_path, model_name):
    """
    Extract a model YAML from .etx ZIP container by actual model name.

    .etx files contain MODELS/model00.yml, MODELS/model01.yml, etc.
    The actual model name is stored in YAML as header.name.
    This function searches for the model by its actual name.
    """
    try:
        with zipfile.ZipFile(etx_path, 'r') as z:
            # Find all MODELS/modelXX.yml files
            model_files = [n for n in z.namelist()
                          if 'MODELS/model' in n and n.endswith('.yml')]

            if not model_files:
                raise FileNotFoundError(f"No MODELS/modelXX.yml files found in {etx_path}")

            # Parse each one and find the one matching model_name
            available = []
            for model_file in sorted(model_files):
                with z.open(model_file) as f:
                    data = yaml.safe_load(f.read())
                    actual_name = data.get('header', {}).get('name', '(unnamed)')
                    available.append(actual_name)

                    if actual_name.lower() == model_name.lower():
                        return data

            # Not found; list available models
            raise FileNotFoundError(
                f"Model '{model_name}' not found in {etx_path}\n"
                f"Available models: {available}"
            )
    except zipfile.BadZipFile:
        raise ValueError(f"{etx_path} is not a valid ZIP file")

def parse_etx(etx_path, model_name):
    """Parse .etx ZIP container and return model structure summary."""
    data = extract_model_from_etx(etx_path, model_name)

    if not data:
        print("ERROR: Could not parse YAML")
        return

    # Get model name from YAML header
    actual_name = data.get('header', {}).get('name', model_name)

    # Model data is in the root (not nested under 'modelData')
    model = data

    # Basic info
    name = model.get('name', '(unknown)')

    # Helper: convert dict with numeric keys to list
    def to_list(d):
        if isinstance(d, list):
            return d
        if isinstance(d, dict):
            return [d.get(str(i)) for i in range(len(d)) if str(i) in d]
        return []

    # Inputs (expoData in EdgeTX YAML)
    inputs = to_list(model.get('expoData', []))
    inputs_summary = {}
    for inp in inputs:
        if inp:
            ch_name = inp.get('name', f"Ch{inp.get('chn', '?')}")
            inputs_summary[ch_name] = {
                'channel': inp.get('chn'),
                'lines': len(inp.get('lines', []))
            }

    # Mixes
    mixes = to_list(model.get('mixData', []))
    mixes_summary = {}
    for mix in mixes:
        if mix:
            mix_name = mix.get('name', '(unnamed)')
            mixes_summary[mix_name] = {
                'destCh': mix.get('destCh'),
                'lines': len(mix.get('lines', []))
            }

    # Flight modes
    flight_modes_data = model.get('flightModeData', {})
    flight_modes = list(flight_modes_data.values()) if isinstance(flight_modes_data, dict) else flight_modes_data

    # Trims
    trims_data = model.get('trimData', {})
    trims = list(trims_data.values()) if isinstance(trims_data, dict) else trims_data

    # Output channels (limits)
    limits_data = model.get('limitData', {})
    outputs = list(limits_data.values()) if isinstance(limits_data, dict) else limits_data

    # Logical switches
    logical_switches_data = model.get('logicalSw', {})
    logical_switches = list(logical_switches_data.values()) if isinstance(logical_switches_data, dict) else logical_switches_data

    # Special functions
    special_functions_data = model.get('customFn', {})
    special_functions = list(special_functions_data.values()) if isinstance(special_functions_data, dict) else special_functions_data

    # GVars
    gvars_data = model.get('gvarData', {})
    gvars = list(gvars_data.values()) if isinstance(gvars_data, dict) else gvars_data

    # Telemetry
    telemetry_data = model.get('sensorData', {})
    telemetry = list(telemetry_data.values()) if isinstance(telemetry_data, dict) else telemetry_data

    # Print structured summary
    print(f"Model: {actual_name}")
    print(f"Container: {Path(etx_path).name}")
    print(f"Source YAML: {model_name}.yml (searched by header.name)")
    print()

    print("=== INPUTS (Expo) ===")
    if inputs_summary:
        for ch_name, info in sorted(inputs_summary.items()):
            print(f"  {ch_name}: {info['lines']} line(s)")
    else:
        print("  (none)")
    print(f"Total: {len(inputs_summary)}")
    print()

    print("=== MIXES ===")
    if mixes_summary:
        for mix_name, info in sorted(mixes_summary.items()):
            print(f"  {mix_name}: {info['lines']} line(s)")
    else:
        print("  (none)")
    print(f"Total: {len(mixes_summary)}")
    print()

    print("=== FLIGHT MODES ===")
    if flight_modes:
        for i, fm in enumerate(flight_modes[:5]):
            fm_name = fm.get('name', f"FM{i}")
            print(f"  {fm_name}")
        if len(flight_modes) > 5:
            print(f"  ... and {len(flight_modes)-5} more")
    else:
        print("  (none)")
    print(f"Total: {len(flight_modes)}")
    print()

    print("=== TRIMS ===")
    if trims:
        for i, trim in enumerate(trims[:6]):
            print(f"  Trim[{i}]: {trim}")
    else:
        print("  (none)")
    print(f"Total: {len(trims)}")
    print()

    print("=== OUTPUT CHANNELS ===")
    if outputs:
        for i, out in enumerate(outputs[:6]):
            name = out.get('name', f"Out{i}")
            print(f"  {name}")
        if len(outputs) > 6:
            print(f"  ... and {len(outputs)-6} more")
    else:
        print("  (none)")
    print(f"Total: {len(outputs)}")
    print()

    print("=== OTHER SECTIONS ===")
    print(f"  Logical switches: {len(logical_switches)}")
    print(f"  Special functions: {len(special_functions)}")
    print(f"  GVars: {len(gvars)}")
    print(f"  Telemetry sensors: {len(telemetry)}")
    print()

    # Summary complexity
    complexity = len(inputs_summary) + len(mixes_summary) + len(flight_modes)
    if complexity < 3:
        complexity_str = "MINIMAL"
    elif complexity < 10:
        complexity_str = "SIMPLE"
    elif complexity < 25:
        complexity_str = "MODERATE"
    else:
        complexity_str = "COMPLEX"

    print(f"Complexity: {complexity_str} ({complexity} features)")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 etx-parser.py <container.etx> <model-name>")
        print("")
        print("Example:")
        print("  python3 etx-parser.py models/bamf2.etx bamf2")
        sys.exit(1)

    etx_path = sys.argv[1]
    model_name = sys.argv[2]

    if not Path(etx_path).exists():
        print(f"ERROR: {etx_path} not found")
        sys.exit(1)

    try:
        parse_etx(etx_path, model_name)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
