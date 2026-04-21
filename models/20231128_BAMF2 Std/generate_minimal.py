#!/usr/bin/env python3
"""
Minimal working BAMF2 generator - based on 1chnl structure.
Uses placeholder mixes/inputs like 1chnl but with BAMF2 names.
"""

import struct
import yaml
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
    for byte in data:
        crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ byte) & 0xFF]) & 0xFFFF
    return crc

def encode_name(name: str, max_len: int = 15) -> bytes:
    name_bytes = name.encode('ascii', errors='ignore')[:max_len]
    return bytes([len(name_bytes)]) + name_bytes

def load_bamf2():
    with open('/tmp/MODELS/model10.yml') as f:
        return yaml.safe_load(f)

def main():
    model = load_bamf2()

    # Get input names from YAML
    input_names = [inp['name'] for inp in model.get('expoData', [])]

    content = bytearray()

    # Preamble
    content.extend(b'\x00\x00')

    # Model name
    content.extend(encode_name("BAMF2 Std"))

    # Bitmap (16 bytes, all zeros)
    content.extend(b'\x00' * 16)

    # Config block (exactly like 1chnl but with different trim values for Rudder)
    content.extend(b'\xff\xff\x30\x31\x00\x00\x00\x01\x00\x00\x00\x00\x00')

    # Trim count
    content.append(6)

    # Trim blocks (from BAMF2 YAML flight mode data)
    # Rudder trim from FM0: -28 = 0xffe4
    trims = [
        b'\x02\x19\x00\x02\x01\xe4\xff',  # Rudder: -28
        b'\x02\x19\x00\x02\x01\x00\x00',  # Elevator: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # Aileron: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # Throttle: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # T5: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # T6: 0
    ]
    for trim in trims:
        content.extend(trim)

    # Channel slots (exactly like 1chnl)
    content.extend(b'\x00\x00\x06')  # separator + count
    content.extend(b'\x00\x01\x02\x03\x04\x05')  # sources
    content.extend(b'\x00\x00\x00')  # padding
    content.extend(b'\x80\x80\x82\xe8\x03\x82\x18\xfc\x80\x01\x00\x00\x00\x00\x00\x00')  # default data

    # Channel entry (just first one, rest are inactive like 1chnl)
    content.extend(b'\x04Out1')  # name
    content.extend(b'\x01' * 18)  # flags + data (all 0x01 = inactive)

    # Rest of channels (5 more, all inactive)
    for _ in range(5):
        content.extend(b'\x00' + b'\x01' * 19)

    # Separator before RF block
    content.extend(b'\x00')

    # RF module blocks (copied from 1chnl exactly)
    content.extend(b'\x0c\x00\x00\x00\x00\x00\x00\x00')
    content.extend(b'\x10\x00kVkVbDfH\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01\x00\x02\x00\x00\x00\x00\x00')

    content.extend(b'\x00\x0a\x00\x00\x00\x00\x00\x00')
    content.extend(b'\x10\x00kVkVbDfH\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01\x00\x0a\x00\x00\x0a\x00\x00\x01\x00\x00\x00\x00\x00')

    # Mix (just one, like 1chnl but with BAMF2 first mix name "Elev")
    content.extend(encode_name("Elev"))  # or first mix from YAML
    content.extend(b'\xff\xff\xff\xff')  # NONE switch
    # Copy exact mix data from 1chnl
    content.extend(b'\x01\x00\x00\x00\x00\x00\x00\x01\x01\x11\x00\x00\x00\x01\x00\x01\x00\x00\x00\x81\x64\x01\x80\x01\x00\x00\x00\x00\x00\x00')

    # Inputs (5 inputs, like BAMF2, but using 1chnl structure)
    content.append(len(input_names))  # input count
    content.extend(b'\x00\x00')  # padding

    for inp_name in input_names:
        content.extend(encode_name(inp_name))
        # Var name (padded to 8 chars)
        var_name = inp_name[:8].ljust(8)
        content.append(len(var_name))
        content.extend(var_name.encode('ascii'))
        # Var data (exactly like 1chnl)
        content.extend(b'\x08\x00')  # flags
        content.extend(b'\x01\x00\x00\x00')  # control bytes
        content.extend(b'\x82\x18\xfc\x82\xe8\x03')  # rates
        content.extend(b'\x00' * 6)  # padding

    # Footer (exactly like 1chnl)
    content.extend(b'\x55\x55\x55\x55')
    content.extend(b'\x01\x01\x00\x00\x00\x04\x00\x00\x00\x00\xa1\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00')

    # Build header
    content_bytes = bytes(content)
    crc = crc16_ccitt(content_bytes)

    header = b'FRSK'
    header += bytes([1, 0, 1, 0x25])
    header += struct.pack('<I', len(content_bytes))
    header += bytes([0x81, 0x17, crc & 0xFF, (crc >> 8) & 0xFF])

    binary = header + content_bytes

    # Write output
    output_path = Path(__file__).parent / "BAMF2_Std_attempt_1.bin"
    with open(output_path, 'wb') as f:
        f.write(binary)

    print(f"✓ Generated {output_path} ({len(binary)} bytes)")
    print(f"  Inputs: {', '.join(input_names)}")

if __name__ == '__main__':
    main()
