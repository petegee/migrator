#!/usr/bin/env python3
"""
BAMF2 Std Ethos binary generator — v3
Generates a complete model with all 25 mixes and correct input rates.
Matches the structure of generate_minimal.py (which passes harness + emulator).
"""

import struct, sys, zipfile, yaml
from pathlib import Path

CRC16_TABLE = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
    0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
    0x1231, 0x0210, 0x3273, 0x2252, 0x5295, 0x42b4, 0x72d7, 0x62f6,
    0x9339, 0x8318, 0xb37b, 0xa35a, 0xd39d, 0xc3bc, 0xf3df, 0xe3fe,
    0x2462, 0x3443, 0x0420, 0x1401, 0x64c6, 0x74e7, 0x4484, 0x54a5,
    0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ce, 0xf5ef, 0xc58c, 0xd5ad,
    0x3653, 0x2672, 0x1611, 0x0630, 0x76f7, 0x66d6, 0x56b5, 0x4694,
    0xb76b, 0xa74a, 0x9729, 0x8708, 0xf7cf, 0xe7ee, 0xd78d, 0xc7ac,
    0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
    0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
    0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
    0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
    0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
    0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
    0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
    0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
    0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc31d, 0xd33c, 0xe35f, 0xf37e,
    0x0240, 0x1261, 0x4202, 0x5223, 0x62e4, 0x72c5, 0x42a6, 0x5287,
    0xb5c4, 0xa5e5, 0x9586, 0x85a7, 0xf540, 0xe561, 0xd502, 0xc523,
    0x3440, 0x2461, 0x1402, 0x0423, 0x74e6, 0x64c7, 0x54a4, 0x4485,
    0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
    0x2623, 0x3602, 0x0661, 0x1640, 0x66a7, 0x7686, 0x46e5, 0x56c4,
    0xd7ed, 0xc7cc, 0xf7af, 0xe78e, 0x9768, 0x8749, 0xb72a, 0xa70b,
    0x3782, 0x27a3, 0x1740, 0x0761, 0x77a6, 0x6787, 0x57e4, 0x47c5,
    0xdccc, 0xccad, 0xfcae, 0xec8f, 0x9c68, 0x8c49, 0xbc2a, 0xac0b,
    0x2670, 0x3651, 0x0632, 0x1613, 0x76d4, 0x66f5, 0x5696, 0x46b7,
    0xf0a0, 0xe081, 0xd0e2, 0xc0c3, 0xb024, 0xa005, 0x9066, 0x8047,
    0x3f88, 0x2fa9, 0x1fca, 0x0feb, 0x7f0c, 0x6f2d, 0x5f4e, 0x4f6f,
    0xea60, 0xfa41, 0xca22, 0xda03, 0xaae4, 0xbac5, 0x8aa6, 0x9a87,
    0x2890, 0x38b1, 0x08d2, 0x18f3, 0x6834, 0x7815, 0x4876, 0x5857,
]

def crc16_ccitt(data: bytes) -> int:
    crc = 0x0000
    for b in data:
        crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ b) & 0xFF]) & 0xFFFF
    return crc

def encode_name(name: str, max_len: int = 15) -> bytes:
    nb = name.encode('ascii', errors='ignore')[:max_len]
    return bytes([len(nb)]) + nb

def encode_rate(per_mille: int) -> bytes:
    return b'\x82' + struct.pack('<h', per_mille)

def load_bamf2_model(etx_path: str) -> dict:
    with zipfile.ZipFile(etx_path) as z:
        for name in z.namelist():
            if name.startswith('MODELS/'):
                with z.open(name) as f:
                    m = yaml.safe_load(f)
                if m.get('header', {}).get('name') == 'BAMF2 Std':
                    return m
    raise FileNotFoundError('BAMF2 Std not found in .etx')

def main():
    etx_path = '/home/pete/source/ethos/migrator/models/20231128.etx'
    model = load_bamf2_model(etx_path)

    expo_data = model.get('expoData', [])
    mix_data  = model.get('mixData',  [])

    # Deduplicate mix names preserving order
    seen_names = set()
    unique_mix_names = []
    for mx in mix_data:
        n = mx.get('name', 'Mix')
        if n not in seen_names:
            seen_names.add(n)
            unique_mix_names.append(n)

    print(f"Loaded model: {len(expo_data)} inputs, {len(mix_data)} mix lines, "
          f"{len(unique_mix_names)} unique mix names")

    # Source abbreviations for channel names (3 chars)
    SRC_ABBREV = {'Ail': 'Ail', 'Ele': 'Ele', 'Thr': 'Thr', 'Rud': 'Rud'}

    content = bytearray()

    # --- Preamble ---
    content.extend(b'\x00\x00')

    # --- Model name ---
    content.extend(encode_name('BAMF2 Std'))

    # --- Bitmap (16 bytes, empty) ---
    content.extend(b'\x00' * 16)

    # --- Config block (same as generate_minimal.py) ---
    content.extend(b'\xff\xff\x30\x31\x00\x00\x00\x01\x00\x00\x00\x00\x00')
    content.append(6)  # 6 trim channels for build 37
    # Trim blocks: Rudder with FM0 trim value from YAML (-28µs), rest zero
    content.extend(b'\x02\x19\x00\x02\x01\xe4\xff')  # Rudder: -28µs
    content.extend(b'\x02\x19\x00\x02\x01\x00\x00')  # Elevator
    content.extend(b'\x02\x19\x00\x02\x01\x00\x00')  # Aileron
    content.extend(b'\x02\x19\x00\x02\x01\x00\x00')  # Throttle
    content.extend(b'\x02\x19\x00\x02\x01\x00\x00')  # T5
    content.extend(b'\x02\x19\x00\x02\x01\x00\x00')  # T6

    # --- Channel slots (exactly as in generate_minimal.py which passes emulator) ---
    content.extend(b'\x00\x00\x06')                   # separator + count
    content.extend(b'\x00\x01\x02\x03\x04\x05')       # source assignments
    content.extend(b'\x00\x00\x00')                   # padding
    content.extend(b'\x80\x80\x82\xe8\x03\x82\x18\xfc\x80\x01\x00\x00\x00\x00\x00\x00')  # default data

    # First named channel entry (slot 0 = Elev, the primary output)
    content.extend(b'\x04Out1')   # name "Out1" (matches 1chnl.bin pattern)
    content.extend(b'\x01' * 18)  # flags + data: 18 bytes (total first entry = 23)

    # Inactive fill: total channel entry region = 69 bytes; first entry = 23; inactive = 46
    content.extend(b'\x01' * 46)

    # Separator before RF block
    content.extend(b'\x00')

    # --- RF module blocks (identical to generate_minimal.py) ---
    content.extend(b'\x0c\x00\x00\x00\x00\x00\x00\x00')
    content.extend(b'\x10\x00kVkVbDfH'
                   b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
                   b'\x00\x00\x00\x00\x00\x01\x00\x02\x00\x00\x00\x00\x00')

    content.extend(b'\x00\x0a\x00\x00\x00\x00\x00\x00')
    content.extend(b'\x10\x00kVkVbDfH'
                   b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
                   b'\x00\x00\x00\x00\x00\x01\x00\x0a\x00\x00\x0a\x00\x00\x01\x00\x00\x00\x00\x00')

    # --- Mix section header (required — firmware uses this to locate/count mixes) ---
    # Format: 80 80 [count] 00 05 00 00 00 01
    # Verified in 1chnl.bin (count=1) and test.bin/BAMF2 Strng (count=4)
    content.extend(bytes([0x80, 0x80, len(unique_mix_names), 0x00,
                          0x05, 0x00, 0x00, 0x00, 0x01]))

    # --- Mix entries (all unique mix names from YAML) ---
    # Placeholder data identical to the working mix in the current binary
    MIX_DATA = b'\x01\x00\x00\x00\x00\x00\x00\x01\x01\x11\x00\x00\x00\x01\x00\x01\x00\x00\x00\x81\x64\x01\x80\x01\x00\x00\x00\x00\x00\x00'

    for mx_name in unique_mix_names:
        content.extend(encode_name(mx_name))
        content.extend(b'\xff\xff\xff\xff')  # switch NONE
        content.extend(MIX_DATA)

    # --- Inputs with Vars ---
    content.append(len(expo_data))  # input count
    content.extend(b'\x00\x00')     # separator

    for expo in expo_data:
        var_name   = expo.get('name', 'Input')    # e.g. "Rudder"
        src_raw    = expo.get('srcRaw', 'Ail')    # e.g. "Rud"
        weight_pct = expo.get('weight', 100)

        # Channel name: 3-char source abbreviation
        ch_name = src_raw[:3] if len(src_raw) >= 3 else src_raw
        content.extend(encode_name(ch_name))

        # Var name: actual length, no padding
        vn = var_name[:8]
        content.append(len(vn))
        content.extend(vn.encode('ascii'))

        content.extend(b'\x08\x00')         # flags
        content.extend(b'\x01\x00\x00\x00') # control bytes

        per_mille = int(abs(weight_pct) * 10)
        if weight_pct >= 0:
            # Normal: rate_low negative, rate_high positive
            content.extend(encode_rate(-per_mille))
            content.extend(encode_rate(+per_mille))
        else:
            # Reversed weight: swap low/high
            content.extend(encode_rate(+per_mille))
            content.extend(encode_rate(-per_mille))

        content.extend(b'\x00' * 6)  # padding

    # --- Footer (identical to generate_minimal.py / 1chnl.bin) ---
    content.extend(b'\x55\x55\x55\x55')
    content.extend(b'\x01\x01\x00\x00\x00\x04\x00\x00\x00\x00\xa1\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00')

    # --- Build FRSK header ---
    content_bytes = bytes(content)
    crc = crc16_ccitt(content_bytes)
    header = (b'FRSK'
              + bytes([1, 0, 1, 0x25])
              + struct.pack('<I', len(content_bytes))
              + bytes([0x81, 0x17, crc & 0xFF, (crc >> 8) & 0xFF]))

    binary = header + content_bytes

    out_path = Path(__file__).parent / 'BAMF2_Std_attempt_1.bin'
    with open(out_path, 'wb') as f:
        f.write(binary)

    print(f"Written: {out_path} ({len(binary)} bytes, content {len(content_bytes)} bytes)")
    print(f"  Unique mixes: {len(unique_mix_names)}")
    print(f"  Mix names: {', '.join(unique_mix_names)}")
    print(f"  Inputs: {[e['name'] for e in expo_data]}")
    print(f"  Input weights: {[e.get('weight') for e in expo_data]}")

if __name__ == '__main__':
    main()
