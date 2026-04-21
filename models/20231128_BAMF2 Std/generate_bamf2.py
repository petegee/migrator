#!/usr/bin/env python3
"""
Ethos Binary Generator for BAMF2 Std model.
Reverse-engineers the EdgeTX YAML into Ethos binary format.
"""

import struct
import sys
from pathlib import Path

# CRC16-CCITT lookup table (XMODEM)
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
    """Compute CRC16-CCITT (XMODEM) for Ethos binary."""
    crc = 0x0000
    for byte in data:
        crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ byte) & 0xFF]) & 0xFFFF
    return crc

def encode_name(name: str, max_len: int = 15) -> bytes:
    """Encode name as length-prefixed ASCII."""
    name_bytes = name.encode('ascii')[:max_len]
    return bytes([len(name_bytes)]) + name_bytes

def encode_int16_le(value: int) -> bytes:
    """Encode signed int16 as little-endian."""
    return struct.pack('<h', value)

def encode_per_mille(value: float) -> bytes:
    """Encode per-mille rate (1000‰ = 100%) as 0x82 [lo] [hi]."""
    per_mille = int(value)
    return b'\x82' + encode_int16_le(per_mille)

class EthosBinaryBuilder:
    def __init__(self, model_name: str = "BAMF2 Std"):
        self.model_name = model_name
        self.content = bytearray()

    def add_preamble(self):
        """Add 2-byte preamble (always 00 00)."""
        self.content.extend(b'\x00\x00')

    def add_model_name(self):
        """Add model name (length-prefixed)."""
        self.content.extend(encode_name(self.model_name))

    def add_bitmap(self, bitmap: str = ""):
        """Add 16-byte bitmap field (zero-padded)."""
        bitmap_bytes = bitmap.encode('ascii')[:15]
        self.content.extend((bitmap_bytes + b'\x00' * 16)[:16])

    def add_config_block(self, trim_data):
        """Add model config block with trim channels."""
        # Fixed bytes for build 37
        self.content.extend(b'\xff\xff')  # bytes 0-1
        self.content.extend(b'\x30\x31')  # bytes 2-3 (unknown, observed in 1chnl.bin)
        self.content.extend(b'\x00\x00\x00')  # bytes 4-6
        self.content.extend(b'\x01')  # byte 7
        self.content.extend(b'\x00\x00\x00\x00')  # bytes 8-11
        self.content.extend(b'\x00')  # byte 12

        # Trim channel count (byte 13)
        self.content.append(len(trim_data))

        # Trim channel blocks (7 bytes each)
        for trim in trim_data:
            self.content.extend(trim)

    def add_flight_modes(self, fm_data):
        """Add flight mode blocks."""
        # For now, add minimal FM blocks
        # Full FM structure not yet fully decoded, using firmware defaults
        pass

    def add_channel_slots(self):
        """Add channel slots section (6 fixed output channels)."""
        self.content.extend(b'\x00\x00')  # separator
        self.content.append(6)  # slot count
        self.content.extend(b'\x00\x01\x02\x03\x04\x05')  # source assignments
        self.content.extend(b'\x00\x00\x00')  # padding
        self.content.extend(b'\x80\x80\x82\xe8\x03\x82\x18\xfc\x80\x01\x00\x00\x00\x00\x00\x00')  # default data

        # Named channel entries (minimal - just mark as inactive)
        channel_names = ["Elev", "Rudd", "AilR", "AilL", "ThmC", "SpdC"]
        for i, name in enumerate(channel_names):
            self.content.extend(encode_name(name))
            self.content.extend(b'\x01\x01')  # flags
            self.content.extend(b'\x01' * 16)  # inactive config

    def add_rf_modules(self):
        """Add two 40-byte RF module records."""
        # Module header marker
        self.content.extend(b'\x0c\x00\x00\x00\x00\x00\x00\x00')  # header bytes
        self.content.extend(b'\x10\x00')  # name field marker
        self.content.extend(b'kVkVbDfH')  # ACCST identifier
        self.content.extend(b'\x00' * 6)  # padding/name
        self.content.extend(b'\x00' * 16)  # rest of first record

        # Second RF module record (same structure)
        self.content.extend(b'\x00\x0a\x00\x00\x00\x00\x00\x00')
        self.content.extend(b'\x10\x00')  # name field marker
        self.content.extend(b'kVkVbDfH')  # ACCST identifier
        self.content.extend(b'\x00' * 6)
        self.content.extend(b'\x00' * 16)

    def add_mixes(self, mix_data):
        """Add mix entries."""
        # For BAMF2: add simplified mixes with basic structure
        for mix in mix_data:
            name = mix.get('name', '')
            self.content.extend(encode_name(name))
            self.content.extend(b'\xff\xff\xff\xff')  # NONE switch
            # Basic mix data structure
            self.content.extend(b'\x01\x00\x00\x00\x00\x00\x00\x01\x01\x11\x00\x00\x00\x01\x00\x01\x00\x00\x00\x81\x64\x01\x80\x01\x00\x00\x00\x00\x00\x00')

    def add_inputs(self, input_data):
        """Add inputs with vars section."""
        self.content.append(len(input_data))  # input count
        self.content.extend(b'\x00\x00')  # padding

        for inp in input_data:
            name = inp.get('name', '')
            self.content.extend(encode_name(name))

            # Add one var per input (simplified)
            var_name = name[:3].ljust(8)  # pad to 8 chars for display
            self.content.extend(encode_name(var_name))
            self.content.extend(b'\x08\x00')  # flags

            # Var data: control + rates + padding
            self.content.extend(b'\x01\x00\x00\x00')  # control bytes
            self.content.extend(encode_per_mille(-1000))  # rate_low
            self.content.extend(encode_per_mille(1000))   # rate_high
            self.content.extend(b'\x00' * 6)  # padding

    def add_footer(self):
        """Add footer section."""
        self.content.extend(b'\x55\x55\x55\x55')  # footer marker
        # Add minimal trailing bytes
        self.content.extend(b'\x01\x01\x00\x00\x00\x04\x00\x00\x00\x00\xa1\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00')

    def build(self) -> bytes:
        """Build the complete binary with header and checksum."""
        content_bytes = bytes(self.content)
        crc = crc16_ccitt(content_bytes)

        header = b'FRSK'  # magic
        header += bytes([1, 0, 1, 0x25])  # version + build 37
        header += struct.pack('<I', len(content_bytes))  # content length
        header += bytes([0x81, 0x17])  # file type + schema version
        header += bytes([crc & 0xFF, (crc >> 8) & 0xFF])  # CRC low, high

        return header + content_bytes

def main():
    # Parse BAMF2 model structure
    trim_data = [
        b'\x02\x19\x00\x02\x01\xe4\xff',  # Rudder: value = -28 (0xffe4 = -28)
        b'\x02\x19\x00\x02\x01\x00\x00',  # Elevator: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # Aileron: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # Throttle: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # T5: 0
        b'\x02\x19\x00\x02\x01\x00\x00',  # T6: 0
    ]

    input_data = [
        {'name': 'Rud', 'weight': 800},    # 80%
        {'name': 'Ele', 'weight': 550},    # 55%
        {'name': 'Thr', 'weight': 1000},   # 100%
        {'name': 'Ail', 'weight': -270},   # -27%
        {'name': 'Thr', 'weight': 1000},   # 100% (CrowDi source)
    ]

    mix_data = [
        {'name': 'Elev'},
        {'name': 'RSComp'},
        {'name': 'ElevCo'},
        {'name': 'CAL'},
        {'name': 'RUD'},
        {'name': 'RUD'},
        {'name': 'Ail-Ru'},
        {'name': 'CAL'},
        {'name': 'AILL'},
        {'name': 'AilTri'},
        {'name': 'El-Flp'},
        {'name': 'CrowDi'},
        {'name': 'AilLCa'},
        {'name': 'AilLRf'},
        {'name': 'LncOfS'},
        {'name': 'Flpron'},
        {'name': 'CAL'},
        {'name': 'AILR'},
        {'name': 'AilTri'},
        {'name': 'El-Flp'},
        {'name': 'CrowDi'},
        {'name': 'AilRCa'},
        {'name': 'AilRRf'},
        {'name': 'Flpron'},
        {'name': 'LncOfS'},
    ]

    builder = EthosBinaryBuilder("BAMF2 Std")
    builder.add_preamble()
    builder.add_model_name()
    builder.add_bitmap()
    builder.add_config_block(trim_data)
    builder.add_flight_modes([])  # TODO: implement FM blocks
    builder.add_channel_slots()
    builder.add_rf_modules()
    builder.add_mixes(mix_data)
    builder.add_inputs(input_data)
    builder.add_footer()

    binary = builder.build()

    # Write to file
    output_path = Path(__file__).parent / "BAMF2_Std_attempt_1.bin"
    with open(output_path, 'wb') as f:
        f.write(binary)

    print(f"✓ Generated {output_path} ({len(binary)} bytes)")
    print(f"  Content: {len(binary) - 16} bytes")
    print(f"  CRC: {struct.unpack('<H', binary[14:16])[0]:04x}")

if __name__ == '__main__':
    main()
