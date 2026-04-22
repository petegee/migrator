#!/usr/bin/env python3
"""Generate BAMF2 Std attempt-1.bin for Ethos firmware."""
import struct

# ── CRC16-CCITT (XMODEM) ──────────────────────────────────────────────────────
def _build_crc_table():
    t = []
    for i in range(256):
        crc = i << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if (crc & 0x8000) else (crc << 1)
        t.append(crc & 0xFFFF)
    return t

CRC_TABLE = _build_crc_table()

def crc16(data: bytes) -> int:
    crc = 0
    for b in data:
        crc = (CRC_TABLE[((crc >> 8) ^ b) & 0xFF] ^ (crc << 8)) & 0xFFFF
    return crc

# ── Helpers ───────────────────────────────────────────────────────────────────
def encode_name(s: str) -> bytes:
    b = s.encode('ascii')[:15]
    return bytes([len(b)]) + b

def pack_s16le(v: int) -> bytes:
    return struct.pack('<h', v)

# ── Build content ─────────────────────────────────────────────────────────────
def build_content() -> bytes:
    c = bytearray()

    # 5.1 Preamble
    c += b'\x00\x00'

    # 5.2 Model name
    c += encode_name('BAMF2 Std')

    # 5.3 Bitmap (16 bytes, no image)
    c += b'\x00' * 16

    # 7. Model Config Block (14 bytes, same as 1chnl.bin)
    c += bytes([0xFF, 0xFF, 0x30, 0x31, 0x00, 0x00, 0x00,
                0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x06])  # trim_count=6

    # 7. Trim channel blocks (6 × 7 bytes, all at 0 µs)
    TRIM_BLOCK = bytes([0x02, 0x19, 0x00, 0x02, 0x01, 0x00, 0x00])
    for _ in range(6):
        c += TRIM_BLOCK

    # 8. Channel slots section
    c += b'\x00\x00'                                   # separator
    c += bytes([0x06])                                 # slot_count
    c += bytes([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])  # src_assignments
    c += b'\x00\x00\x00'                               # padding
    c += bytes([0x80, 0x80, 0x82, 0xE8, 0x03, 0x82, 0x18, 0xFC,
                0x80, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])  # default_data

    # Named channel entry: slot 0 = "Elev" (from limitData[0].name)
    c += encode_name('Elev')
    c += bytes([0x01, 0x01])    # flags
    c += bytes([0x01] * 16)     # inactive data

    # Slots 1–5: inactive fill (46 bytes of 0x01 total, matching 1chnl.bin)
    c += bytes([0x01] * 46)

    # Separator before RF block
    c += b'\x00'

    # 9. RF Module Block (2 × 40 bytes, from 1chnl.bin)
    RF_REC1 = bytes([
        0x0C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x10, 0x00, 0x6B, 0x56, 0x6B, 0x56, 0x62, 0x44,
        0x66, 0x48, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ])
    RF_REC2 = bytes([
        0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x01, 0x00,
        0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x10, 0x00, 0x6B, 0x56, 0x6B, 0x56, 0x62, 0x44,
        0x66, 0x48, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ])
    c += RF_REC1 + RF_REC2

    # Intermediate bytes between RF and mix header (17 bytes, from 1chnl.bin)
    c += bytes([0x00, 0x00, 0x00, 0x01, 0x00, 0x0A, 0x00, 0x00,
                0x0A, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00])

    # 10. Mix section
    # Mixes in order from EdgeTX mixData
    mixes = [
        # (name, dest_ch_0based)
        ('Elev',   0), ('RSComp', 0), ('ElevCo', 0), ('CAL',    0),
        ('RUD',    1), ('RUD',    1), ('Ail-Ru', 1), ('CAL',    1),
        ('AILL',   2), ('AilTri', 2), ('El-Flp', 2), ('CrowDi', 2),
        ('AilLCa', 2), ('AilLRf', 2), ('LncOfS', 2), ('Flpron', 2), ('CAL', 2),
        ('AILR',   3), ('AilTri', 3), ('El-Flp', 3), ('CrowDi', 3),
        ('AilRCa', 3), ('AilRRf', 3), ('Flpron', 3), ('LncOfS', 3), ('CAL', 3),
        ('Therma', 8), ('FineAd', 8),
        ('Speed',  9),
        ('AilLnc',10), ('Adj',   10),
        ('Volume', 13),
        ('ELECom',14), ('ElCmpT',14),
        ('Volume', 16),
    ]
    mix_count = len(mixes)

    # Mix section header: 80 80 [count] 00 05 00 00 00 01
    c += bytes([0x80, 0x80, mix_count, 0x00, 0x05, 0x00, 0x00, 0x00, 0x01])

    # Track rank per dest channel
    SECONDARY_SEQ = [0x08, 0x0E, 0x11, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06]
    rank_by_dest = {}

    MIX_SUFFIX = bytes([
        0x00, 0x00, 0x00, 0x01, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x81, 0x64, 0x01,
        0x80, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
    ])  # 22 bytes

    for i, (name, dest_ch) in enumerate(mixes):
        if i > 0:
            c += b'\x01'  # separator BETWEEN entries
        rank = rank_by_dest.get(dest_ch, 0)
        rank_by_dest[dest_ch] = rank + 1
        sec_byte = SECONDARY_SEQ[rank % len(SECONDARY_SEQ)]
        ch_byte = dest_ch + 1  # 1-indexed
        mix_prefix = bytes([0x01, 0x00, 0x00, 0x00, 0x01, ch_byte, sec_byte, 0x00])
        c += encode_name(name)
        c += b'\xFF\xFF\xFF\xFF'          # switch = NONE
        c += mix_prefix + MIX_SUFFIX      # 30 bytes total

    # 8b. Inputs with Vars
    inputs = [
        # (channel_name, var_name, rate_permill)
        ('Rud', 'Rudder',  800),
        ('Ele', 'Elevat',  550),
        ('Thr', 'Thottl', 1000),
        ('Ail', 'Ailero', 1000),  # use 1000 not -270 for attempt 1
        ('Thr', 'CrowDi', 1000),
    ]
    input_count = len(inputs)
    c += bytes([input_count, 0x00, 0x00])  # count + separator

    VAR_FLAGS = bytes([0x08, 0x00])

    for ch_name, var_name, rate in inputs:
        c += encode_name(ch_name)
        c += encode_name(var_name)
        c += VAR_FLAGS
        # Var data (16 bytes)
        rate_lo = -rate  # negative
        rate_hi = +rate  # positive
        var_data = (bytes([0x01, 0x00, 0x00, 0x00])
                    + bytes([0x82]) + pack_s16le(rate_lo)
                    + bytes([0x82]) + pack_s16le(rate_hi)
                    + bytes([0x00] * 6))
        c += var_data

    # Post-inputs section (126 bytes, from 1chnl.bin — encodes empty LS/SF/GVar/Telem)
    POST_INPUTS = bytes([
        0x03,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
        0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
        0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
        0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
        0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x04,0x00,0x01,0x00,0x00,0x00,
        0x00,0x00,0x00,0x00,0x00,0x00,0x02,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x15,0x00,
        0x00,0x00,0x01,0x02,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x15,0x00,0x01,0x00,0x01,
        0x02,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x15,0x00,0x02,0x00,0x01,0x00,
    ])
    c += POST_INPUTS

    # Footer: UUUU + trailer (from 1chnl.bin)
    FOOTER = bytes([
        0x55, 0x55, 0x55, 0x55,
        0x01, 0x01, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00,
        0x00, 0x00, 0xA1, 0x00, 0x00, 0x01, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ])
    c += FOOTER

    return bytes(c)


def write_bin(content: bytes, build: int = 0x25) -> bytes:
    crc = crc16(content)
    header = (b'FRSK'
              + bytes([0x01, 0x00, 0x01, build])
              + struct.pack('<I', len(content))
              + bytes([0x81, 0x17, crc & 0xFF, (crc >> 8) & 0xFF]))
    return header + content


if __name__ == '__main__':
    content = build_content()
    data = write_bin(content)
    out = 'attempt-1.bin'
    with open(out, 'wb') as f:
        f.write(data)
    print(f'Written: {out} ({len(data)} bytes, content={len(content)} bytes)')
    print(f'CRC: {crc16(content):#06x}')
