#!/usr/bin/env python3
"""Creates a proper multi-size ICO file from PNG images (PNG-in-ICO, RFC-compliant)."""
import struct, sys, os

def png_dimensions(data):
    # IHDR is at offset 16 in a valid PNG
    w = struct.unpack('>I', data[16:20])[0]
    h = struct.unpack('>I', data[20:24])[0]
    return w, h

def make_ico(png_paths, ico_path):
    images = []
    for p in png_paths:
        with open(p, 'rb') as f:
            data = f.read()
        w, h = png_dimensions(data)
        images.append((w, h, data))

    count = len(images)
    header = struct.pack('<HHH', 0, 1, count)  # reserved, type=1 (icon), count

    header_size = 6
    dir_size    = 16 * count
    entries     = b''
    payloads    = b''
    offset      = header_size + dir_size

    for (w, h, data) in images:
        img_size = len(data)
        bw = w if w < 256 else 0
        bh = h if h < 256 else 0
        # width, height, colorCount, reserved, planes, bitCount, size, offset
        entries += struct.pack('<BBBBHHII', bw, bh, 0, 0, 1, 32, img_size, offset)
        payloads += data
        offset   += img_size

    with open(ico_path, 'wb') as f:
        f.write(header + entries + payloads)
    print(f'  ICO écrit : {ico_path}  ({os.path.getsize(ico_path)} bytes, {count} taille(s))')

base = os.path.join(os.path.dirname(__file__), '..', 'public')

# Multi-size ICO: 16 + 32
make_ico([
    os.path.join(base, 'icons', 'favicon-16.png'),
    os.path.join(base, 'icons', 'favicon-32.png'),
], os.path.join(base, 'favicon.ico'))

print('Fait.')
