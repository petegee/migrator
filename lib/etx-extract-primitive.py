#!/usr/bin/env python3
"""
Extract a single primitive from an EdgeTX .etx model file.

Usage:
  python3 lib/etx-extract-primitive.py <etx-file> <model-name> <type> [<index>]
  python3 lib/etx-extract-primitive.py <etx-file> <model-name> --list

Types: model-info, var, mix, output, curve, logical-switch, special-function
"""
import sys
import yaml
import zipfile
from pathlib import Path


def to_indexed(d):
    """Convert dict with int-string keys or list to {int: value} dict."""
    if isinstance(d, list):
        return {i: v for i, v in enumerate(d) if v is not None}
    if isinstance(d, dict):
        result = {}
        for k, v in d.items():
            try:
                result[int(k)] = v
            except (ValueError, TypeError):
                pass
        return result
    return {}


def load_model(etx_path, model_name):
    with zipfile.ZipFile(etx_path, 'r') as z:
        model_files = [n for n in z.namelist()
                       if 'MODELS/model' in n and n.endswith('.yml')]
        for mf in sorted(model_files):
            with z.open(mf) as f:
                data = yaml.safe_load(f.read())
            if data.get('header', {}).get('name', '').lower() == model_name.lower():
                return data
    raise FileNotFoundError(f"Model '{model_name}' not found in {etx_path}")


SECTION_MAP = {
    'flight-mode':      'flightModeData',
    'var':              'expoData',
    'mix':              'mixData',
    'output':           'limitData',
    'curve':            'curves',
    'logical-switch':   'logicalSw',
    'special-function': 'customFn',
}


def list_primitives(data):
    print("model-info: 1")
    header = data.get('header', {})
    print(f"  name={header.get('name', '?')} type={header.get('modelType', '?')}")
    for ptype, section_key in SECTION_MAP.items():
        section = to_indexed(data.get(section_key, {}))
        # For flight modes, skip unnamed entries with no meaningful switch
        if ptype == 'flight-mode':
            meaningful = {
                k: v for k, v in section.items()
                if isinstance(v, dict) and (v.get('name') or v.get('swtch', 'NONE') not in ('NONE', '', None))
            }
            print(f"{ptype}: {len(section)} total, {len(meaningful)} non-empty")
            for idx in sorted(meaningful.keys()):
                item = meaningful[idx]
                name = item.get('name') or f"(unnamed)"
                swtch = item.get('swtch', 'NONE')
                print(f"  [{idx}] {name}  swtch={swtch}")
        else:
            print(f"{ptype}: {len(section)}")
            for idx in sorted(section.keys()):
                item = section[idx]
                name = item.get('name', f"#{idx}") if isinstance(item, dict) else f"#{idx}"
                print(f"  [{idx}] {name}")


def extract_primitive(data, ptype, index):
    if ptype == 'model-info':
        return {
            'type': 'model-info',
            'data': data.get('header', {}),
        }

    section_key = SECTION_MAP.get(ptype)
    if not section_key:
        raise ValueError(f"Unknown type '{ptype}'. Valid: model-info, {', '.join(SECTION_MAP)}")

    section = to_indexed(data.get(section_key, {}))
    total = len(section)

    if index not in section:
        raise IndexError(
            f"Index {index} not found in {section_key} "
            f"(total: {total}, available: {sorted(section.keys())})"
        )

    result = {
        'type': ptype,
        'index': index,
        'total_count': total,
        'data': section[index],
    }

    if ptype == 'curve':
        curves = to_indexed(data.get('curves', {}))
        all_points = to_indexed(data.get('points', {}))
        offset = 0
        for i in sorted(curves.keys()):
            if i >= index:
                break
            c = curves[i]
            n_pts = 5 + c.get('points', 0)
            if c.get('type', 0) == 1:
                n_pts *= 2
            offset += n_pts
        c = curves[index]
        n_pts = 5 + c.get('points', 0)
        if c.get('type', 0) == 1:
            n_pts *= 2
        result['point_values'] = [
            all_points.get(offset + j, {}).get('val', 0) for j in range(n_pts)
        ]

    return result


def main():
    if len(sys.argv) < 4:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    etx_path = sys.argv[1]
    model_name = sys.argv[2]
    ptype = sys.argv[3]

    if not Path(etx_path).exists():
        print(f"ERROR: {etx_path} not found", file=sys.stderr)
        sys.exit(1)

    try:
        data = load_model(etx_path, model_name)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    if ptype == '--list':
        list_primitives(data)
        return

    index = None
    if ptype != 'model-info':
        if len(sys.argv) < 5:
            print(f"ERROR: index required for type '{ptype}'", file=sys.stderr)
            sys.exit(1)
        try:
            index = int(sys.argv[4])
        except ValueError:
            print(f"ERROR: index must be an integer, got '{sys.argv[4]}'", file=sys.stderr)
            sys.exit(1)

    try:
        primitive = extract_primitive(data, ptype, index)
    except (ValueError, IndexError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    print(yaml.dump(primitive, default_flow_style=False, allow_unicode=True))


if __name__ == '__main__':
    main()
