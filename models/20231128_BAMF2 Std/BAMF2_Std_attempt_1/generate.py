#!/usr/bin/env python3
"""Generate attempt-1.bin for BAMF2 Std Ethos model (build 37)."""

import struct

# ---------------------------------------------------------------------------
# CRC-16/XMODEM: poly=0x1021, non-reflected, init=0, no final XOR
# ---------------------------------------------------------------------------

def build_crc16_table():
    t = []
    for i in range(256):
        crc = i << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc = crc << 1
        t.append(crc & 0xFFFF)
    return t

CRC16_TABLE = build_crc16_table()

def crc16_ccitt(data: bytes) -> int:
    crc = 0
    for b in data:
        crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ b) & 0xFF]) & 0xFFFF
    return crc

def encode_name(s: str) -> bytes:
    b = s.encode('ascii')[:15]
    return bytes([len(b)]) + b

def write_ethos_bin(content: bytes, build: int = 0x25) -> bytes:
    crc = crc16_ccitt(content)
    ck = bytes([0x81, 0x17, crc & 0xFF, (crc >> 8) & 0xFF])
    header = b'FRSK' + bytes([1, 0, 1, build]) + struct.pack('<I', len(content)) + ck
    return header + content

# ---------------------------------------------------------------------------
# Verified constants from 1chnl.bin (firmware-generated, build 37, 0 diffs)
# ---------------------------------------------------------------------------

# RF record 1 (40 bytes exact)
RF_RECORD_1 = bytes.fromhex(
    '0c0000000000000010006b566b5662446648'
    '00000000000000000000000000000000'
    '000000000000'
)
assert len(RF_RECORD_1) == 40

# RF record 2 (40 bytes exact)
RF_RECORD_2 = bytes.fromhex(
    '000000010002000000000002000001000a'
    '0000000000000010006b566b5662446648'
    '000000000000'
)
assert len(RF_RECORD_2) == 40

# Post-RF / pre-mix bytes (33 bytes, always constant in 1chnl.bin)
POST_RF_PRE_MIX = bytes.fromhex(
    '0000000000000000000000000000000000000001000a00000a0000010000000000'
)
assert len(POST_RF_PRE_MIX) == 33

# Post-input section (126 bytes from 1chnl.bin — covers LS/SF/GVars/telemetry in minimal form)
# Extracted verbatim: python3 -c "... content[input_end:uuuu_pos].hex()"
POST_INPUT = bytes.fromhex(
    '030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000004000100000000000000000002000000000000001500000001020000000000000015000100010200000000000000150002000100'
)
assert len(POST_INPUT) == 126, f"POST_INPUT is {len(POST_INPUT)} bytes, expected 126"

# Footer tail (23 bytes after UUUU)
FOOTER_TAIL = bytes.fromhex('01010000000400000000a1000001000000000000000000')
assert len(FOOTER_TAIL) == 23

# ---------------------------------------------------------------------------
# Mix data constants (build 37, verified PASS 0-diffs from previous work)
# ---------------------------------------------------------------------------

MIX_FIXED_HEAD = bytes([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])  # [0-7]
MIX_TAIL_PREFIX = bytes([0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00])        # [10-16]
MIX_TAIL_SUFFIX = bytes([0x00, 0x81, 0x64, 0x01, 0x80, 0x01,               # [18-29]
                          0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

# ---------------------------------------------------------------------------
# Source model: BAMF2 Std
# ---------------------------------------------------------------------------

# Mixes: (name, destCh)  — destCh is 0-indexed (EdgeTX convention)
MIXES = [
    ("Elev",   0),   # 0
    ("RSComp", 0),   # 1
    ("ElevCo", 0),   # 2
    ("CAL",    0),   # 3
    ("RUD",    1),   # 4
    ("RUD",    1),   # 5
    ("Ail-Ru", 1),   # 6
    ("CAL",    1),   # 7
    ("AILL",   2),   # 8
    ("AilTri", 2),   # 9
    ("El-Flp", 2),   # 10
    ("CrowDi", 2),   # 11
    ("AilLCa", 2),   # 12
    ("AilLRf", 2),   # 13
    ("LncOfS", 2),   # 14
    ("Flpron", 2),   # 15
    ("CAL",    2),   # 16
    ("AILR",   3),   # 17
    ("AilTri", 3),   # 18
    ("El-Flp", 3),   # 19
    ("CrowDi", 3),   # 20
    ("AilRCa", 3),   # 21
    ("AilRRf", 3),   # 22
    ("Flpron", 3),   # 23
    ("LncOfS", 3),   # 24
    ("CAL",    3),   # 25
    ("Therma", 8),   # 26
    ("FineAd", 8),   # 27
    ("Speed",  9),   # 28
    ("AilLnc", 10),  # 29
    ("Adj",    10),  # 30
    ("Volume", 13),  # 31
    ("ELECom", 14),  # 32
    ("ElCmpT", 14),  # 33
    ("Volume", 16),  # 34
]

# Inputs: (channel_name, weight_percent)
# weight_percent is the EdgeTX rate; used to compute ±|weight|*10 permille
INPUTS = [
    ("Rudder", 80),
    ("Elevat", 55),
    ("Thottl", 100),
    ("Ailero", -27),  # negative = inverted aileron
    ("CrowDi", 100),
]

# ---------------------------------------------------------------------------
# Build content
# ---------------------------------------------------------------------------

c = bytearray()

# --- 1. Preamble ---
c += b'\x00\x00'

# --- 2. Model name: "BAMF2 Std" ---
c += encode_name("BAMF2 Std")

# --- 3. Bitmap (16 bytes, no image) ---
c += b'\x00' * 16

# --- 4. Model Config Block (14 bytes, same as 1chnl.bin) ---
# FF FF 30 31 00 00 00 01 00 00 00 00 00 06
c += bytes([0xFF, 0xFF, 0x30, 0x31, 0x00, 0x00, 0x00, 0x01,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x06])

# --- 5. Trim Channel Blocks (6 × 7 bytes, all 0µs) ---
# 02=type, 19=range(25%), 00=step(Fine), 02=mode(Easy), 01=audio(ON), 00 00=value(0µs)
for _ in range(6):
    c += bytes([0x02, 0x19, 0x00, 0x02, 0x01, 0x00, 0x00])

# --- 6. Channel Slots Section ---
c += b'\x00\x00'                              # separator
c += bytes([0x06])                             # slot_count = 6
c += bytes([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])  # src_assignments
c += b'\x00\x00\x00'                          # padding
# Default TLV data block:
c += bytes([0x80, 0x80, 0x82, 0xE8, 0x03, 0x82, 0x18, 0xFC,
            0x80, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

# Slot 0: named "Elev" (from limitData[0].name in EdgeTX YAML)
c += encode_name("Elev")
c += bytes([0x01, 0x01])  # flags
c += b'\x01' * 16         # inactive/default data

# Slots 1-5: inactive (46 bytes of 0x01 fill, verified from 1chnl.bin)
c += b'\x01' * 46

# Separator before RF block
c += b'\x00'

# --- 7. RF Module Block (2 × 40 bytes) ---
c += RF_RECORD_1
c += RF_RECORD_2

# --- 8. Post-RF / Pre-Mix bytes (33 bytes, constant) ---
c += POST_RF_PRE_MIX

# --- 9. Mix Section Header ---
mix_count = len(MIXES)
c += bytes([0x80, 0x80, mix_count, 0x00, 0x05, 0x00, 0x00, 0x00, 0x01])

# --- 10. Mix Entries ---
for i, (name, dest_ch) in enumerate(MIXES):
    if i > 0:
        c += b'\x01'          # separator BETWEEN entries (never before first)
    ch_byte = dest_ch + 1     # 1-indexed destination channel
    sec_byte = i + 1          # globally unique, starts at 1 (never 0)
    c += encode_name(name)
    c += b'\xFF\xFF\xFF\xFF'  # switch = NONE (always active)
    # 30-byte data block (build 37 verified format):
    c += MIX_FIXED_HEAD
    c += bytes([ch_byte, sec_byte])
    c += MIX_TAIL_PREFIX
    c += bytes([i])            # pool key discriminator (unique per entry)
    c += MIX_TAIL_SUFFIX

# --- 11. Inputs with Vars Section ---
c += bytes([len(INPUTS)])  # input_count
c += b'\x00\x00'           # separator

for ch_name, weight_pct in INPUTS:
    rate_abs = abs(weight_pct) * 10  # convert % to permille
    if weight_pct >= 0:
        rate_lo = -rate_abs  # negative
        rate_hi = +rate_abs  # positive
    else:
        # Inverted: swap sign convention
        rate_lo = +rate_abs  # positive (inverted low)
        rate_hi = -rate_abs  # negative (inverted high)

    c += encode_name(ch_name)                       # Input channel name
    c += encode_name(ch_name)                       # Var name (same for simplicity)
    c += bytes([0x08, 0x00])                        # flags (from 1chnl.bin)
    c += bytes([0x01, 0x00, 0x00, 0x00])            # control bytes
    c += b'\x82' + struct.pack('<h', rate_lo)       # rate_low  (always negative for normal)
    c += b'\x82' + struct.pack('<h', rate_hi)       # rate_high (always positive for normal)
    c += b'\x00' * 6                                # padding

# --- 12. Post-Input Section (logical switches, SFs, GVars, telemetry — minimal) ---
c += POST_INPUT

# --- 13. Footer ---
c += b'\x55\x55\x55\x55'  # UUUU
c += FOOTER_TAIL

# ---------------------------------------------------------------------------
# Wrap with FRSK header and write
# ---------------------------------------------------------------------------

content = bytes(c)
data = write_ethos_bin(content)

output_path = 'attempt-1.bin'
with open(output_path, 'wb') as f:
    f.write(data)

print(f"Written: {output_path} ({len(data)} bytes, content={len(content)} bytes)")

# Sanity checks
assert data[:4] == b'FRSK', "Bad magic"
assert data[7] == 0x25, "Wrong build"
assert data[12] == 0x81, "Wrong file type"
assert data[13] == 0x17, "Wrong schema version"
clen = struct.unpack_from('<I', data, 8)[0]
assert clen == len(data) - 16, f"Content length mismatch: {clen} vs {len(data)-16}"
crc_calc = crc16_ccitt(data[16:])
assert (crc_calc & 0xFF) == data[14], f"CRC low mismatch: {crc_calc & 0xFF:02x} vs {data[14]:02x}"
assert (crc_calc >> 8) == data[15], f"CRC high mismatch: {crc_calc >> 8:02x} vs {data[15]:02x}"
assert data[16:18] == b'\x00\x00', "Bad preamble"
print("All sanity checks PASSED")

# Summary
print(f"\nContent breakdown (content offsets):")
name_len = data[18]
name = data[19:19+name_len].decode()
print(f"  Model name: {name!r}")
bitmap_end = 19 + name_len + 16
print(f"  Config block at: 0x{bitmap_end-16:04x}")
print(f"  Mixes: {mix_count}")
print(f"  Inputs: {len(INPUTS)}")
