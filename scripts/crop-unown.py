#!/usr/bin/env python3
"""Cut the Unown sheet (28 glyphs: a-z, !, ?) into assets/unown/*.png, black on transparent, 256px square.

Usage: python3 scripts/crop-unown.py ~/Desktop/unknown.png   (needs pillow, numpy, scipy)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / 'Desktop/unknown.png')
OUT = Path(__file__).resolve().parent.parent / 'assets/unown'
NAMES = [*'abcdefghijklmnopqrstuvwxyz', 'bang', 'question']
ROWS = [10, 9, 9]
SIZE, PAD = 256, 20

src = Image.open(SRC).convert('RGBA')
img = Image.alpha_composite(Image.new('RGBA', src.size, (255, 255, 255, 255)), src).convert('L')  # flatten transparency onto white
ink = np.asarray(img) < 128


def inside(a, c):
    return a[0].start >= c[0].start and a[0].stop <= c[0].stop and a[1].start >= c[1].start and a[1].stop <= c[1].stop


# Each glyph is one outer shape plus any shapes sitting inside it (the eye, the hole in "a"). Neighbours can overlap
# horizontally, so a glyph is cut out by its own shapes, not by a column range.
lab, n = ndimage.label(ink)
boxes = ndimage.find_objects(lab)
outer = [i for i in range(n) if not any(j != i and inside(boxes[i], boxes[j]) for j in range(n))]
assert len(outer) == sum(ROWS), f'expected {sum(ROWS)} glyphs, found {len(outer)}'
glyphs = []
for i in outer:
    parts = [j for j in range(n) if j == i or inside(boxes[j], boxes[i])]
    glyphs.append((boxes[i], np.isin(lab[boxes[i]], [j + 1 for j in parts])))
mid = sorted((b[0].start + b[0].stop) / 2 for b, _ in glyphs)
cuts = [mid[ROWS[0] - 1], mid[ROWS[0] + ROWS[1] - 1]]
rowOf = lambda b: sum((b[0].start + b[0].stop) / 2 > c for c in cuts)
glyphs.sort(key=lambda g: (rowOf(g[0]), g[0][1].start))
assert [sum(rowOf(b) == r for b, _ in glyphs) for r in range(3)] == ROWS, 'rows do not split 10/9/9'

OUT.mkdir(parents=True, exist_ok=True)
for n, (_, g) in enumerate(glyphs):
    ys = np.where(g.any(axis=1))[0]
    g = g[ys[0]:ys[-1] + 1]
    h, w = g.shape
    scale = (SIZE - 2 * PAD) / max(h, w)
    alpha = Image.fromarray((g * 255).astype('uint8')).resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    tile = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    black = Image.new('RGBA', alpha.size, (0, 0, 0, 255))
    black.putalpha(alpha)
    tile.paste(black, ((SIZE - alpha.width) // 2, (SIZE - alpha.height) // 2))
    tile.save(OUT / f'{NAMES[n]}.png')
print(f'wrote {len(glyphs)} glyphs to {OUT}')
